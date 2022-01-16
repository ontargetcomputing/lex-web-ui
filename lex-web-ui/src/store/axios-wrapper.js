import axios from 'axios';

export const axiosWithRetry  = async (config) => {
  return axios(config)
    .catch((error) => {
      console.error(`Attempted call: ${JSON.stringify(config)}`)
      console.error(`1) unsuccessful call: ${JSON.stringify(error)}`);
      return axios(config)
        .catch((error) => {
          console.error(`2) unsuccessful call: ${JSON.stringify(error)}`);
          return axios(config)
            .catch((error) => {
              console.error(`3) unsuccessful call: ${JSON.stringify(error)}`);
              return Promise.reject(error);
            });            
        }); 
    });
};

