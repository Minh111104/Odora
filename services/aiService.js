import OpenAI from 'openai';
import { config } from '../config';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

/**
 * Generate a vivid scent description from a food image
 * @param {string} imageBase64 - Base64 encoded image
 * @returns {Promise<string>} - AI-generated scent description
 */
export async function generateScentDescription(imageBase64) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Describe the aromas and smells of this food in vivid, sensory detail. 
                     Write 2-3 sentences that evoke the scent memory. 
                     Be warm, nostalgic, and emotionally evocative. 
                     Focus on specific scent notes like herbs, spices, cooking methods (roasted, simmered, etc.), 
                     and the feelings these aromas bring. 
                     Write as if you're helping someone remember home.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating scent description:', error);
    throw new Error(
      'Failed to generate scent description. Please check your API key and try again.'
    );
  }
}

/**
 * Suggest similar candles or incense based on the scent description
 * @param {string} scentDescription - The scent description
 * @returns {Promise<string[]>} - Array of product suggestions
 */
export async function suggestScentProducts(scentDescription) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: `Based on this scent description: "${scentDescription}"
                   
                   Suggest 3-4 candles or incense products that might recreate similar aromas.
                   Format: Just the product names, one per line.
                   Be specific with scent notes (e.g., "Cinnamon & Vanilla Spice Candle" not just "Spice Candle")`,
        },
      ],
      max_tokens: 150,
    });

    const suggestions = response.choices[0].message.content
      .trim()
      .split('\n')
      .filter(line => line.trim().length > 0);

    return suggestions;
  } catch (error) {
    console.error('Error suggesting scent products:', error);
    return [];
  }
}
