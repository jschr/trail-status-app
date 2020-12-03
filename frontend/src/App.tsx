import React from 'react';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import blue from '@material-ui/core/colors/blue';
import { Router, Switch, Route, Redirect } from 'react-router-dom';
import { ReactQueryCacheProvider, QueryCache } from 'react-query';
import IndexPage from './pages/IndexPage';
import LoginPage from './pages/LoginPage';
import RegionPage from './pages/RegionPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import history from './history';

const queryCache = new QueryCache({
  defaultConfig: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

export default function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const theme = React.useMemo(
    () =>
      createMuiTheme({
        palette: {
          primary: blue,
          type: prefersDarkMode ? 'dark' : 'light',
        },
      }),
    [prefersDarkMode],
  );

  return (
    <ReactQueryCacheProvider queryCache={queryCache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router history={history}>
          <Switch>
            <Route
              path={['/regions/:id', '/regions/:id/*']}
              component={RegionPage}
            />

            <Route path="/login" component={LoginPage} />

            <Route path="/tos" component={TermsOfServicePage} />

            <Route path="/privacy-policy" component={PrivacyPolicyPage} />

            <Route path="/" component={IndexPage} />

            <Route path="*" render={() => <Redirect to="/" />} />
          </Switch>
        </Router>
      </ThemeProvider>
    </ReactQueryCacheProvider>
  );
}
