const axios = require('axios');
  
module.exports = function(method, url, options = {}) {
  return axios({
    url: options.baseUrl ? `${options.baseUrl}${url}` : url,
    method,
    data: options.data,
    headers: options.headers,
    params: options.params
  }).then(r => {
    return r.data;
  });
}