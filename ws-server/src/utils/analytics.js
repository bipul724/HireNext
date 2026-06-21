import { supabase } from '../config/supabase.js';
import { logger } from './logger.js';
import { randomUUID } from 'crypto';

export async function trackEvent(interviewId, userEmail, userRole, eventType, metadata = {}) {
  // Fire and forget so it doesn't block realtime UX
  (async () => {
    let retries = 3;
    let delay = 1000;
    while (retries > 0) {
      try {
        const { error } = await supabase
          .from('InterviewEvents')
          .insert([{
            id: randomUUID(),
            interviewId,
            userEmail,
            userRole,
            eventType,
            metadata,
            createdAt: new Date().toISOString()
          }]);
        
        if (error) {
          throw new Error(error.message);
        }
        break; // success
      } catch (err) {
        retries--;
        if (retries === 0) {
          logger.error(`Exception tracking event ${eventType} after retries: ${err.message}`);
        } else {
          logger.warn(`Failed to track event ${eventType}, retrying in ${delay}ms... (${err.message})`);
          await new Promise(res => setTimeout(res, delay));
          delay *= 2; // exponential backoff
        }
      }
    }
  })();
}
