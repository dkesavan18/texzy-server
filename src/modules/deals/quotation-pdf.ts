import PDFDocument = require('pdfkit');
import type { QuotationDocument } from './constants/deal-status.constant';

type QuotationPdfInput = {
  dealId: string
  status: string
  createdAt: string | null
  buyerName: string
  sellerName: string
  quotation: QuotationDocument
}

function money(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `INR ${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

/** Builds a simple multi-page quotation PDF buffer (no external HTML renderer). */
export function buildQuotationPdf(input: QuotationPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const q = input.quotation
    const lineTotal =
      q.lineTotal ??
      (q.unitPrice != null ? Math.round(q.unitPrice * q.quantity * 100) / 100 : null)

    doc.fontSize(20).fillColor('#0f172a').text('Texzy Bulk Order Quotation', {
      align: 'left',
    })
    doc.moveDown(0.3)
    doc
      .fontSize(10)
      .fillColor('#64748b')
      .text(`Deal #${input.dealId}  ·  Status: ${input.status}`)
    if (input.createdAt) {
      doc.text(`Created: ${input.createdAt}`)
    }
    doc.moveDown(1)

    doc.fontSize(12).fillColor('#0f172a').text('Parties', { underline: true })
    doc.moveDown(0.4)
    doc.fontSize(10).fillColor('#334155')
    doc.text(`Buyer:  ${input.buyerName}`)
    doc.text(`Seller: ${input.sellerName}`)
    doc.moveDown(1)

    doc.fontSize(12).fillColor('#0f172a').text('Product / Requirement', {
      underline: true,
    })
    doc.moveDown(0.4)
    doc.fontSize(11).fillColor('#0f172a').text(q.title || 'Untitled')
    if (q.description) {
      doc.moveDown(0.3)
      doc.fontSize(10).fillColor('#334155').text(q.description, { align: 'left' })
    }
    doc.moveDown(0.6)

    if (q.specs.length) {
      for (const spec of q.specs) {
        doc.fontSize(10).fillColor('#64748b').text(`${spec.label}: `, {
          continued: true,
        })
        doc.fillColor('#0f172a').text(spec.value)
      }
      doc.moveDown(0.6)
    }

    doc.fontSize(12).fillColor('#0f172a').text('Commercials', { underline: true })
    doc.moveDown(0.4)
    doc.fontSize(10).fillColor('#334155')
    doc.text(`Quantity:     ${q.quantity}${q.unit ? ` ${q.unit}` : ''}`)
    doc.text(`Unit price:   ${money(q.unitPrice)}`)
    doc.text(`Line total:   ${money(lineTotal)}`)
    if (q.deliverAddress) {
      doc.text(`Delivery:     ${q.deliverAddress}`)
    }
    doc.moveDown(0.8)

    if (q.buyerNote) {
      doc.fontSize(12).fillColor('#0f172a').text('Buyer note', { underline: true })
      doc.moveDown(0.3)
      doc.fontSize(10).fillColor('#334155').text(q.buyerNote)
      doc.moveDown(0.6)
    }
    if (q.sellerNote) {
      doc.fontSize(12).fillColor('#0f172a').text('Seller note', { underline: true })
      doc.moveDown(0.3)
      doc.fontSize(10).fillColor('#334155').text(q.sellerNote)
      doc.moveDown(0.6)
    }

    if (q.images.length) {
      doc.fontSize(12).fillColor('#0f172a').text('Reference images', {
        underline: true,
      })
      doc.moveDown(0.3)
      doc.fontSize(9).fillColor('#64748b')
      for (const url of q.images.slice(0, 6)) {
        doc.text(url, { link: url, underline: true })
      }
      doc.moveDown(0.6)
    }

    doc.moveDown(1)
    doc
      .fontSize(9)
      .fillColor('#94a3b8')
      .text(
        'This quotation is generated from a Texzy Bulk Order deal. Prices and terms are subject to mutual acceptance by buyer and seller.',
        { align: 'left' },
      )

    doc.end()
  })
}

export function parseQuotationNotes(notes: string | null): QuotationDocument | null {
  if (!notes) return null
  try {
    const parsed = JSON.parse(notes) as QuotationDocument
    if (parsed?.version === 1 && parsed.kind) return parsed
  } catch {
    return null
  }
  return null
}

export function stringifyQuotation(doc: QuotationDocument): string {
  return JSON.stringify(doc)
}
