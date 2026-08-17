import { styles } from './styles';

export default function LoginForm({ doLogin, password, setPassword, loginError }) {
  return (
    <main style={styles.wrap}>
      <h1 style={styles.h1}>Family order packs</h1>
      <p style={styles.sub}>Private. Enter the family password.</p>
      <form onSubmit={doLogin} style={styles.card}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          style={styles.input}
          autoFocus
        />
        <button type="submit" style={styles.btnGreen}>
          Open app
        </button>
        {loginError ? <p style={styles.err}>{loginError}</p> : null}
      </form>
    </main>
  );
}
