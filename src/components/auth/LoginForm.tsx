import { LoginScreen } from './LoginScreen';

export interface LoginFormProps {
  onLoginSuccess?: (data: { user: any; profile: any }) => void;
}

export default LoginScreen;
export { LoginScreen };
