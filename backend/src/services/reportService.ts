// src/services/reportService.ts
import puppeteer from 'puppeteer';
import { AppDataSource } from '../dataSource';
import { Scan } from '../models/Scan';
import { Report } from '../models/Report';

const reportRepository = AppDataSource.getRepository(Report);
const scanRepository = AppDataSource.getRepository(Scan);

export const reportService = {
  async generateReport(userId: number, scanId: number, format: 'PDF' | 'HTML') {
    // 1. Validate scan belongs to user
    const scan = await scanRepository.findOneBy({ id: scanId, userId });
    if (!scan) throw new Error('Scan not found or not authorized');

    // 2. Create a new Report record
    const report = reportRepository.create({ scanId, format });
    await reportRepository.save(report);

    // 3. Example Puppeteer usage to generate PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Render some HTML. Could be a local file or external URL
    // For example, you can load a local template with the results
    await page.setContent(`<html><body><h1>Scan Report #${scan.id}</h1></body></html>`);

    let outputPath = `reports/scan-${scan.id}-report-${report.id}.${format.toLowerCase()}`;
    if (format === 'PDF') {
      await page.pdf({ path: outputPath, format: 'A4' });
    } else {
      // If HTML, just save content or do something else
    }

    await browser.close();

    // 4. Optionally store or return the path or a public URL
    const reportUrl = `/static/${outputPath}`;
    
    return reportUrl;
  },
};
