export function toTimesheetDto({ header, worklogs }) {
  return {
    header,
    worklogs: worklogs || []
  };
}
