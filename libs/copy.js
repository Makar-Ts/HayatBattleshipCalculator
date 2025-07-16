/**
 * Copy an object
 * @param {object} data 
 * @returns {object} object copy
 */
const copy = (data) => JSON.parse(JSON.stringify(data))

export default copy;