'use server'

import Anthropic from '@anthropic-ai/sdk'

export interface ExtractedCertData {
  issueDate: string | null
  expiryDate: string | null
  certName: string | null
  error?: string
}

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const SUPPORTED_PDF_TYPE = 'application/pdf'

export async function extractCertData(
  base64: string,
  mediaType: string
): Promise<ExtractedCertData> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { issueDate: null, expiryDate: null, certName: null, error: 'API key not configured' }

  const client = new Anthropic({ apiKey })

  const prompt = `You are reading a certification or training card document. Extract the following fields:
1. Issue date / valid from date
2. Expiry / expiration date
3. The certification or course name/title

Return ONLY valid JSON with this exact structure, no other text:
{"issueDate":"YYYY-MM-DD","expiryDate":"YYYY-MM-DD","certName":"string"}

Rules:
- Format all dates as YYYY-MM-DD
- Use null for any field you cannot find or read clearly
- If no expiry date exists (e.g. OSHA 10-hour cards that don't expire), use null
- certName should be the official name shown on the document`

  try {
    let content: Anthropic.MessageParam['content']

    if (SUPPORTED_IMAGE_TYPES.includes(mediaType)) {
      content = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: base64,
          },
        },
        { type: 'text', text: prompt },
      ]
    } else if (mediaType === SUPPORTED_PDF_TYPE) {
      content = [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64,
          },
        } as unknown as Anthropic.TextBlockParam,
        { type: 'text', text: prompt },
      ]
    } else {
      return { issueDate: null, expiryDate: null, certName: null, error: 'Unsupported file type for AI extraction' }
    }

    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 256,
      messages: [{ role: 'user', content }],
    })

    const text = message.content.find((b) => b.type === 'text')?.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { issueDate: null, expiryDate: null, certName: null }

    const parsed = JSON.parse(jsonMatch[0]) as {
      issueDate?: string | null
      expiryDate?: string | null
      certName?: string | null
    }

    return {
      issueDate:  parsed.issueDate  ?? null,
      expiryDate: parsed.expiryDate ?? null,
      certName:   parsed.certName   ?? null,
    }
  } catch (err) {
    console.error('extractCertData error:', err)
    return { issueDate: null, expiryDate: null, certName: null, error: 'Extraction failed' }
  }
}
