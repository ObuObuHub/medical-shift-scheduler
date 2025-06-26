import jwt from 'jsonwebtoken';
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Verify authentication
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { requestId } = req.query;

  if (req.method === 'GET') {
    // Get single swap request details
    try {
      const { rows } = await sql`
        SELECT 
          ssr.*,
          s1.name as requester_name,
          s2.name as target_staff_name,
          s3.name as reviewer_name
        FROM shift_swap_requests ssr
        LEFT JOIN staff s1 ON ssr.requester_id = s1.id
        LEFT JOIN staff s2 ON ssr.target_staff_id = s2.id
        LEFT JOIN staff s3 ON ssr.reviewed_by = s3.id
        WHERE ssr.id = ${requestId}
      `;

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Swap request not found' });
      }

      res.status(200).json(rows[0]);
    } catch (error) {
      console.error('Error fetching swap request:', error);
      res.status(500).json({ error: 'Failed to fetch swap request' });
    }
  } else if (req.method === 'PUT') {
    // Update swap request (approve/reject/cancel)
    const { status, reviewComment } = req.body;

    if (!['approved', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    try {
      // Get the swap request
      const { rows: requestRows } = await sql`
        SELECT * FROM shift_swap_requests WHERE id = ${requestId}
      `;

      if (requestRows.length === 0) {
        return res.status(404).json({ error: 'Swap request not found' });
      }

      const swapRequest = requestRows[0];

      // Check permissions
      if (status === 'cancelled') {
        // Only requester can cancel
        if (swapRequest.requester_id !== req.user.id) {
          return res.status(403).json({ error: 'Only the requester can cancel a swap request' });
        }
      } else {
        // Only managers and admins can approve/reject
        if (!['manager', 'admin'].includes(req.user.role)) {
          return res.status(403).json({ error: 'Only managers and admins can approve or reject swap requests' });
        }

        // Verify manager is from the same hospital
        const { rows: staffRows } = await sql`
          SELECT hospital FROM staff WHERE id = ${req.user.id}
        `;
        if (staffRows[0]?.hospital !== swapRequest.hospital) {
          return res.status(403).json({ error: 'You can only manage swap requests for your hospital' });
        }
      }

      // Begin transaction
      await sql`BEGIN`;

      try {
        // Update the swap request
        const updateParams = [status];
        let updateQuery = `
          UPDATE shift_swap_requests
          SET status = $1, updated_at = CURRENT_TIMESTAMP
        `;

        if (status !== 'cancelled') {
          updateQuery += `, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, review_comment = $3`;
          updateParams.push(req.user.id, reviewComment || null);
        }

        updateQuery += ` WHERE id = $${updateParams.length + 1} RETURNING *`;
        updateParams.push(requestId);

        const { rows: updatedRequestRows } = await sql.query(updateQuery, updateParams);

        if (status === 'approved' && swapRequest.requested_shift_id) {
          // Perform the actual shift swap
          const shift1Id = swapRequest.shift_id;
          const shift2Id = swapRequest.requested_shift_id;
          const staff1Id = swapRequest.requester_id;
          const staff2Id = swapRequest.target_staff_id;

          // Get both shifts
          const { rows: shifts } = await sql`
            SELECT shift_id, staff_ids, reserved_by, status
            FROM shifts
            WHERE shift_id IN (${shift1Id}, ${shift2Id}) AND is_active = true
          `;

          if (shifts.length !== 2) {
            throw new Error('One or both shifts not found');
          }

          const shift1 = shifts.find(s => s.shift_id === shift1Id);
          const shift2 = shifts.find(s => s.shift_id === shift2Id);

          // Update shift 1: Remove staff1, add staff2 (if provided)
          let newStaff1Ids = shift1.staff_ids.filter(id => id !== staff1Id);
          if (staff2Id && !newStaff1Ids.includes(staff2Id)) {
            newStaff1Ids.push(staff2Id);
          }

          // Update shift 2: Remove staff2, add staff1
          let newStaff2Ids = shift2.staff_ids.filter(id => id !== staff2Id);
          if (!newStaff2Ids.includes(staff1Id)) {
            newStaff2Ids.push(staff1Id);
          }

          // Execute the swap
          await sql`
            UPDATE shifts
            SET 
              staff_ids = ${JSON.stringify(newStaff1Ids)},
              status = CASE WHEN array_length(${JSON.stringify(newStaff1Ids)}::jsonb, 1) > 0 THEN 'confirmed' ELSE 'open' END,
              reserved_by = NULL,
              reserved_at = NULL,
              swap_request_id = NULL,
              updated_at = CURRENT_TIMESTAMP,
              updated_by = ${req.user.username}
            WHERE shift_id = ${shift1Id}
          `;

          await sql`
            UPDATE shifts
            SET 
              staff_ids = ${JSON.stringify(newStaff2Ids)},
              status = 'confirmed',
              reserved_by = NULL,
              reserved_at = NULL,
              updated_at = CURRENT_TIMESTAMP,
              updated_by = ${req.user.username}
            WHERE shift_id = ${shift2Id}
          `;
        } else {
          // For rejected or cancelled requests, just update the original shift status
          await sql`
            UPDATE shifts
            SET 
              status = CASE 
                WHEN reserved_by IS NOT NULL THEN 'reserved'
                WHEN array_length(staff_ids::jsonb, 1) > 0 THEN 'confirmed'
                ELSE 'open'
              END,
              swap_request_id = NULL,
              updated_at = CURRENT_TIMESTAMP
            WHERE shift_id = ${swapRequest.shift_id}
          `;
        }

        await sql`COMMIT`;

        res.status(200).json({ 
          message: `Swap request ${status} successfully`, 
          swapRequest: updatedRequestRows[0] 
        });
      } catch (error) {
        await sql`ROLLBACK`;
        throw error;
      }
    } catch (error) {
      console.error('Error updating swap request:', error);
      res.status(500).json({ error: 'Failed to update swap request' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}