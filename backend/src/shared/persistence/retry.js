export async function withRetry(fn, maxRetries = 3, delay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on non-connection errors
      if (!isConnectionError(error)) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        console.error(`Database operation failed after ${maxRetries} attempts:`, error.message);
        throw error;
      }
      
      console.warn(`Database connection failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
  
  throw lastError;
}

function isConnectionError(error) {
  const connectionErrorCodes = [
    'ECONNRESET',
    'ENOTFOUND', 
    'ECONNREFUSED',
    'ETIMEDOUT',
    '57P01', // admin shutdown
    '57P02', // crash shutdown
    '57P03', // cannot connect now
    '08006', // connection failure
    '08001', // SQLCLIENT unable to establish SQLconnection
    '08004', // SQLserver rejected establishment of SQLconnection
    '08007'  // transaction resolution unknown
  ];
  
  return connectionErrorCodes.includes(error.code) || 
         error.message?.includes('Connection terminated') ||
         error.message?.includes('connection was closed');
}
