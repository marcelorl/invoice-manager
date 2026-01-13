export const logger = (
  message: string,
  data: Record<string, any>,
  type: 'INFO' | 'ERROR' | 'WARNING',
) => {
  const logData = JSON.stringify({ message, data }, null, 2);

  switch (type) {
    case 'INFO':
      console.log(logData);
      break;
    case 'ERROR':
      console.error(logData);
      break;
    case 'WARNING':
      console.warn(logData);
      break;
    default:
      console.log(logData);
  }
};
