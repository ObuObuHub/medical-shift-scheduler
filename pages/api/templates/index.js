import { sql } from '../../../lib/vercel-db';
import { authMiddleware, requireRole, runMiddleware } from '../../../lib/auth';

export default async function handler(req, res) {
  try {
    await runMiddleware(req, res, authMiddleware);

    switch (req.method) {
      case 'GET':
        return await getTemplates(req, res);
      case 'POST':
        await runMiddleware(req, res, requireRole(['admin', 'manager']));
        return await createTemplate(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getTemplates(req, res) {
  try {
    const { hospital } = req.query;
    
    let result;
    if (hospital) {
      result = await sql`
        SELECT * FROM templates 
        WHERE is_active = true AND hospital = ${hospital} 
        ORDER BY created_at DESC
      `;
    } else {
      result = await sql`
        SELECT * FROM templates 
        WHERE is_active = true 
        ORDER BY created_at DESC
      `;
    }
    
    // Convert to client format
    const templates = result.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      hospital: t.hospital,
      templateData: t.template_data,
      templateType: t.template_type,
      createdBy: t.created_by,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));

    res.status(200).json(templates);
  } catch (error) {
        res.status(500).json({ error: 'Failed to fetch templates' });
  }
}

async function createTemplate(req, res) {
  try {
    const { name, description, hospital, templateData, templateType } = req.body;

    if (!name || !hospital || !templateData) {
      return res.status(400).json({ error: 'Name, hospital, and template data are required' });
    }

    const result = await sql`
      INSERT INTO templates (name, description, hospital, template_data, template_type, created_by)
      VALUES (${name.trim()}, ${description || ''}, ${hospital}, ${JSON.stringify(templateData)}, ${templateType || 'monthly'}, ${req.user.id})
      RETURNING *;
    `;

    const template = result[0];

    const newTemplate = {
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

    res.status(201).json(newTemplate);
  } catch (error) {
        res.status(500).json({ error: 'Failed to create template' });
  }
}