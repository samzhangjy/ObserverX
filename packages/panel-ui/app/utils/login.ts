import Cookies from 'js-cookie';

export default async function isLoggedIn(serverUrl: string) {
  const username = Cookies.get('username');
  const password = Cookies.get('password');
  const response = await fetch(`${serverUrl}/environment`, {
    headers: {
      Authorization: 'Basic ' + btoa(username + ':' + password),
    },
  });
  return response.status === 200;
}
