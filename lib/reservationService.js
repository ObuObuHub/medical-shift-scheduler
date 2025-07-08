import { sql } from '@vercel/postgres';
import logger from '../utils/logger';

/**
 * Unified reservation service for shift management
 * Handles all reservation logic with consistent validation and error handling
 */
class ReservationService {
  /**
   * Check if a staff member can reserve a shift
   * @param {number} staffId - Staff member ID
   * @param {object} shift - Shift object
   * @param {object} staffMember - Staff member object
   * @param {string} userRole - User role (staff, manager, admin)
   * @returns {object} { canReserve: boolean, error?: string }
   */
  async canReserveShift(staffId, shift, staffMember, userRole = 'staff') {
    try {
      // SIMPLIFIED: Check if shift already has staff assigned
      const currentStaffIds = shift.staff_ids || [];
      if (currentStaffIds.length > 0 && !currentStaffIds.includes(staffId)) {
        return { canReserve: false, error: 'Tura este deja atribuită altui membru al personalului' };
      }

      // Check hospital match
      if (staffMember.hospital !== shift.hospital) {
        return { canReserve: false, error: 'Poți rezerva doar ture din spitalul tău' };
      }

      // Check department match (only if shift has department specified)
      if (shift.department && staffMember.specialization !== shift.department) {
        return { 
          canReserve: false, 
          error: `Poți rezerva doar ture din departamentul tău (${staffMember.specialization}). Această tură este pentru departamentul ${shift.department}.`
        };
      }

      // SIMPLIFIED: Check for conflicts on the same date
      const { rows: conflictRows } = await sql`
        SELECT s.shift_id, s.shift_type
        FROM shifts s
        WHERE s.date = ${shift.date}
          AND s.is_active = true
          AND ${staffId} = ANY(s.staff_ids)
          AND s.shift_id != ${shift.shift_id || shift.id}
      `;

      if (conflictRows.length > 0) {
        return { 
          canReserve: false, 
          error: 'Deja ai o tură programată în această zi',
          conflicts: conflictRows
        };
      }

      // Check reservation limit (2 per month for staff, unlimited for managers/admins)
      if (!['manager', 'admin'].includes(userRole)) {
        const shiftDate = new Date(shift.date);
        const { rows: reservationCountRows } = await sql`
          SELECT COUNT(*) as count
          FROM shifts
          WHERE ${staffId} = ANY(staff_ids)
            AND is_active = true
            AND shift_id != ${shift.shift_id || shift.id}
            AND EXTRACT(YEAR FROM date) = ${shiftDate.getFullYear()}
            AND EXTRACT(MONTH FROM date) = ${shiftDate.getMonth() + 1}
        `;

        const reservationCount = parseInt(reservationCountRows[0].count);
        if (reservationCount >= 2) {
          return { 
            canReserve: false, 
            error: 'Ai atins limita de 2 rezervări de ture pe lună. Anulează o rezervare existentă pentru a face una nouă.',
            currentReservations: reservationCount
          };
        }
      }

      return { canReserve: true };
    } catch (error) {
      logger.error('Error checking reservation eligibility:', error);
      return { canReserve: false, error: 'Eroare la verificarea eligibilității pentru rezervare' };
    }
  }

  /**
   * Reserve a shift for a staff member (simplified version)
   * @param {string} shiftId - Shift ID
   * @param {number} staffId - Staff member ID
   * @param {object} staffMember - Staff member object
   * @param {string} userRole - User role
   * @param {string} username - Username for audit
   * @returns {object} { success: boolean, shift?: object, error?: string }
   */
  async reserveShift(shiftId, staffId, staffMember, userRole = 'staff', username) {
    try {
      // Get shift details
      const { rows: shiftRows } = await sql`
        SELECT * FROM shifts
        WHERE shift_id = ${shiftId} AND is_active = true
      `;

      if (shiftRows.length === 0) {
        return { success: false, error: 'Tura nu a fost găsită' };
      }

      const shift = shiftRows[0];

      // Check if can reserve
      const eligibility = await this.canReserveShift(staffId, shift, staffMember, userRole);
      if (!eligibility.canReserve) {
        return { success: false, error: eligibility.error, conflicts: eligibility.conflicts };
      }

      // SIMPLIFIED: Just add the staff ID to the shift's staff_ids array
      const currentStaffIds = shift.staff_ids || [];
      if (!currentStaffIds.includes(staffId)) {
        currentStaffIds.push(staffId);
      }

      // Update the shift with the new staff assignment
      const { rows: updatedRows } = await sql`
        UPDATE shifts
        SET 
          staff_ids = ${JSON.stringify(currentStaffIds)},
          status = 'assigned',
          updated_at = CURRENT_TIMESTAMP,
          updated_by = ${username}
        WHERE shift_id = ${shiftId} AND is_active = true
        RETURNING *
      `;

      if (updatedRows.length === 0) {
        return { success: false, error: 'Nu s-a putut rezerva tura' };
      }

      // Log the reservation
      logger.info('Shift reserved successfully', {
        shiftId,
        staffId,
        staffName: staffMember.name,
        date: shift.date,
        username
      });

      return { success: true, shift: updatedRows[0] };
    } catch (error) {
      logger.error('Error reserving shift:', error);
      return { success: false, error: 'Eroare la rezervarea turei' };
    }
  }

  /**
   * Cancel a shift reservation (simplified version)
   * @param {string} shiftId - Shift ID
   * @param {number} staffId - Staff member ID requesting cancellation
   * @param {string} userRole - User role
   * @param {string} username - Username for audit
   * @returns {object} { success: boolean, shift?: object, error?: string }
   */
  async cancelReservation(shiftId, staffId, userRole = 'staff', username) {
    try {
      // Get shift details
      const { rows: shiftRows } = await sql`
        SELECT * FROM shifts
        WHERE shift_id = ${shiftId} AND is_active = true
      `;

      if (shiftRows.length === 0) {
        return { success: false, error: 'Tura nu a fost găsită' };
      }

      const shift = shiftRows[0];
      const currentStaffIds = shift.staff_ids || [];

      // SIMPLIFIED: Check if staff member is assigned to this shift
      if (!currentStaffIds.includes(staffId) && !['manager', 'admin'].includes(userRole)) {
        return { success: false, error: 'Poți anula doar propriile atribuții' };
      }

      // Remove the staff ID from the shift
      const updatedStaffIds = currentStaffIds.filter(id => id !== staffId);

      // Update the shift
      const { rows: updatedRows } = await sql`
        UPDATE shifts
        SET 
          staff_ids = ${JSON.stringify(updatedStaffIds)},
          status = ${updatedStaffIds.length > 0 ? 'assigned' : 'open'},
          updated_at = CURRENT_TIMESTAMP,
          updated_by = ${username}
        WHERE shift_id = ${shiftId} AND is_active = true
        RETURNING *
      `;

      if (updatedRows.length === 0) {
        return { success: false, error: 'Nu s-a putut anula atribuirea' };
      }

      // Log the cancellation
      logger.info('Assignment cancelled successfully', {
        shiftId,
        staffId,
        cancelledBy: username,
        date: shift.date
      });

      return { success: true, shift: updatedRows[0] };
    } catch (error) {
      logger.error('Error cancelling assignment:', error);
      return { success: false, error: 'Eroare la anularea atribuirii' };
    }
  }

  /**
   * Get reservation statistics for a staff member (simplified)
   * @param {number} staffId - Staff member ID
   * @param {number} year - Year
   * @param {number} month - Month (1-12)
   * @returns {object} { count: number, hours: number, shifts: array }
   */
  async getReservationStats(staffId, year, month) {
    try {
      const { rows } = await sql`
        SELECT 
          shift_id,
          date,
          shift_type,
          status,
          staff_ids
        FROM shifts
        WHERE ${staffId} = ANY(staff_ids)
          AND is_active = true
          AND EXTRACT(YEAR FROM date) = ${year}
          AND EXTRACT(MONTH FROM date) = ${month}
        ORDER BY date ASC
      `;

      // Calculate total hours
      let totalHours = 0;
      rows.forEach(shift => {
        const shiftType = shift.shift_type;
        totalHours += shiftType.duration || 12;
      });

      return {
        count: rows.length,
        hours: totalHours,
        shifts: rows
      };
    } catch (error) {
      logger.error('Error getting reservation stats:', error);
      return { count: 0, hours: 0, shifts: [] };
    }
  }

  /**
   * Create and immediately reserve a shift
   * @param {object} shiftData - Shift data
   * @param {number} staffId - Staff member ID
   * @returns {object} { success: boolean, shift?: object, error?: string }
   */
  async createAndReserveShift(shiftData, staffId) {
    try {
      // Validate staff member
      const { rows: staffRows } = await sql`
        SELECT id, hospital, name, specialization FROM staff 
        WHERE id = ${staffId} AND is_active = true
      `;

      if (staffRows.length === 0) {
        return { success: false, error: 'Membrul personalului nu a fost găsit' };
      }

      const staffMember = staffRows[0];

      // Validate hospital match
      if (staffMember.hospital !== shiftData.hospital) {
        return { success: false, error: 'Membrul personalului nu aparține acestui spital' };
      }

      // Check if can reserve (using dummy shift object)
      const dummyShift = {
        date: shiftData.date,
        hospital: shiftData.hospital,
        department: shiftData.department,
        status: 'open'
      };

      const eligibility = await this.canReserveShift(staffId, dummyShift, staffMember, 'staff');
      if (!eligibility.canReserve) {
        return { success: false, error: eligibility.error };
      }

      // SIMPLIFIED: Create shift with staff already assigned
      const { rows } = await sql`
        INSERT INTO shifts (
          shift_id,
          date,
          shift_type,
          staff_ids,
          department,
          requirements,
          coverage,
          hospital,
          created_by,
          status,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          ${shiftData.id},
          ${shiftData.date},
          ${JSON.stringify(shiftData.type)},
          ${JSON.stringify([staffId])},
          ${shiftData.department || null},
          ${JSON.stringify(shiftData.requirements || { minDoctors: 1, specializations: [] })},
          ${JSON.stringify({ adequate: true, warnings: [], recommendations: [], staffBreakdown: { doctors: 1, total: 1 } })},
          ${shiftData.hospital},
          NULL,
          'assigned',
          true,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING *
      `;

      if (rows.length === 0) {
        return { success: false, error: 'Nu s-a putut crea tura' };
      }

      logger.info('Shift created and reserved successfully', {
        shiftId: shiftData.id,
        staffId,
        staffName: staffMember.name,
        date: shiftData.date
      });

      return { success: true, shift: rows[0] };
    } catch (error) {
      logger.error('Error creating and reserving shift:', error);
      return { success: false, error: 'Eroare la crearea și rezervarea turei' };
    }
  }
}

// Export singleton instance
const reservationService = new ReservationService();
export default reservationService;