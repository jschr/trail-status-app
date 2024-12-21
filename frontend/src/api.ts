import qs from 'querystring';
import nprogress from 'nprogress';
import ApiClient from '@/clients/ApiClient';
import history from '@/history';

export * from '@/clients/ApiClient';

let accessToken: string | null = null;

nprogress.configure({ showSpinner: false });

const querystring = qs.parse(window.location.search.replace(/^\?/, ''));
if (typeof querystring.sessionToken === 'string') {
  accessToken = querystring.sessionToken;

  localStorage.setItem('accessToken', accessToken);

  delete querystring.sessionToken;
  history.replace(`${history.location.pathname}?${qs.stringify(querystring)}`);
} else {
  accessToken = localStorage.getItem('accessToken');
}

let requests = 0;
let doneTimeout: ReturnType<typeof setTimeout> | null = null;
export default new ApiClient({
  accessToken,
  onUnauthorized: () => history.push('/login'),
  onRequestStart: () => {
    requests += 1;
    nprogress.inc();
  },
  onRequestEnd: () => {
    requests -= 1;

    if (doneTimeout) {
      clearTimeout(doneTimeout);
    }

    setTimeout(() => {
      if (!requests) nprogress.done();
    }, 50);
  },
});
