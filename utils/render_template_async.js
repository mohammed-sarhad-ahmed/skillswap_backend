import { promises as fs } from 'fs';
import mjml from 'mjml';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function renderTemplateAsync(templateName, data) {
  const filePath = path.join(__dirname, '..', 'emails', `${templateName}.mjml`);
  let template = await fs.readFile(filePath, 'utf-8');

  for (const key in data) {
    template = template.replace(new RegExp(`{{${key}}}`, 'g'), data[key]);
  }

  const { html, errors } = mjml(template);
  if (errors.length) {
    console.error('MJML errors:', errors);
  }

  return html;
}

export default renderTemplateAsync;
