import { sql } from '../../../lib/vercel-db';
import { authMiddleware, requireRole, runMiddleware } from '../../../lib/auth';

export default async function handler(req, res) {
  try {
    await runMiddleware(req, res, authMiddleware);

    const { id } = req.query;

    switch (req.method) {
      case 'GET':
        return await getTemplate(req, res, id);
      case 'PUT':
        await runMiddleware(req, res, requireRole(['admin', 'manager']));
        return await updateTemplate(req, res, id);
      case 'DELETE':
        await runMiddleware(req, res, requireRole(['admin', 'manager']));
        return await deleteTemplate(req, res, id);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getTemplate(req, res, id) {
  try {
    const result = await sql`
      SELECT * FROM templates WHERE id = ${id} AND is_active = true;
    `;
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = result[0];
    const templateData = {
      id: template.id,
      name: template.name,
      description: template.description,
      hospital: template.hospital,
      templateData: template.template_data,
      templateType: template.template_type,
      createdBy: template.created_by,
      createdAt: template.created_at,
      updatedAt: template.updated_at
    };

    res.status(200).json(templateData);
  } catch (error) {
        res.status(500).json({ error: 'Failed to fetch template' });
  }
}

async function updateTemplate(req, res, id) {
  try {
    const updates = req.body;
    
    const templateResult = await sql`
      SELECT * FROM templates WHERE id = ${id} AND is_active = true;
    `;
    
    if (templateResult.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const updatedTemplate = await sql`
      UPDATE templates 
      SET 
        name = ${updates.name || templateResult[0].name},
        description = ${updates.description !== undefined ? updates.description : templateResult[0].description},
        hospital = ${updates.hospital || templateResult[0].hospital},
        template_data = ${updates.templateData ? JSON.stringify(updates.templateData) : templateResult[0].template_data},
        template_type = ${updates.templateType || templateResult[0].template_type},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *;
    `;

    const template = updatedTemplate[0];

    const updatedTemplateResult = {
      id: template.id,
      name: template.name,
      description: template.description,
      hospital: template.hospital,
      templateData: template.template_data,
      templateType: template.template_type,
      createdBy: template.created_by,
      createdAt: template.created_at,
      updatedAt: template.updated_at
    };

    res.status(200).json(updatedTemplateResult);
  } catch (error) {
        res.status(500).json({ error: 'Failed to update template' });
  }
}

async function deleteTemplate(req, res, id) {
  try {
    const result = await sql`
      UPDATE templates 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND is_active = true
      RETURNING id;
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.status(200).json({ message: 'Template deleted successfully' });
  } catch (error) {
        res.status(500).json({ error: 'Failed to delete template' });
  }
}