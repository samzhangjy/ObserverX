import Cookies from 'js-cookie';

export default function getAuth() {
  const username = Cookies.get('username');
  const password = Cookies.get('password');
  return 'Basic ' + btoa(username + ':' + password);
}
