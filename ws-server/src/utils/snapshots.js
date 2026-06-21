import { supabase } from '../config/supabase.js';
import { logger } from './logger.js';
import { randomUUID } from 'crypto';

export async function saveSnapshot(interviewId, userEmail, code, language, reason) {
  (async () => {
    let retries = 3;
    let delay = 1000;
    while (retries > 0) {
      try {
        const { error } = await supabase
          .from('CodeSnapshots')
          .insert([{
            id: randomUUID(),
            interviewId,
            userEmail,
            code,
            language,
            reason,
            createdAt: new Date().toISOString()
          }]);
        
        if (error) {
          throw new Error(error.message);
        }
        break;
      } catch (err) {
        retries--;
        if (retries === 0) {
          logger.error(`Exception saving snapshot after retries: ${err.message}`);
        } else {
          logger.warn(`Failed to save snapshot, retrying in ${delay}ms... (${err.message})`);
          await new Promise(res => setTimeout(res, delay));
          delay *= 2;
        }
      }
    }
  })();
}
