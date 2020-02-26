import qs from 'querystring';
import ApiClient from './clients/ApiClient';
import history from './history';

let sessionToken: string | null = null;

const querystring = qs.parse(window.location.search.replace(/^\?/, ''));
if (typeof querystring.sessionToken === 'string') {
  sessionToken = querystring.sessionToken;

  localStorage.setItem('sessionToken', sessionToken);

  delete querystring.sessionToken;
  history.replace(`${history.location.pathname}?${qs.stringify(querystring)}`);
} else {
  sessionToken = localStorage.getItem('sessionToken');
}

export default new ApiClient(sessionToken, () => {
  history.push('/login');
});
