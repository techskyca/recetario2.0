// Pantalla de bloqueo / control de acceso privado para el Recetario Ultraseco 2.0
import React, { useEffect, useRef, useState } from 'react';
import { recipeService } from '../services/recipeService';

interface LoginScreenProps {
  onSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess }) => {
  const [clave, setClave] = useState('');
  const [mostrarClave, setMostrarClave] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clave.trim()) {
      setError('Ingrese la clave de acceso.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await recipeService.login(clave);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clave de acceso incorrecta.');
      inputRef.current?.focus();
      inputRef.current?.select();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: 'var(--bg-app)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'var(--bg-surface)',
          border: '2px solid var(--text-primary)',
        }}
      >
        <div
          style={{
            backgroundColor: '#E2E6EC',
            borderBottom: '1px solid var(--border-color)',
            padding: '18px 22px',
          }}
        >
          <span className="sidebar-brand-code">ACCESO RESTRINGIDO · FORMULACIONES</span>
          <h1 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            RECETARIO ULTRASECO 2.0
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Sistema protegido de preparación y producción hidrofóbica
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '22px' }}>
          {error && (
            <div className="status-banner error" style={{ marginBottom: '16px', padding: '10px 12px' }} role="alert">
              <span>🔒 {error}</span>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="login-clave-input" className="field-label">
              Clave de Acceso Autorizada *
            </label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <input
                id="login-clave-input"
                ref={inputRef}
                type={mostrarClave ? 'text' : 'password'}
                className="field-input mono"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                placeholder="Ingrese la clave de acceso..."
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="btn"
                onClick={() => setMostrarClave((v) => !v)}
                style={{ flexShrink: 0 }}
                title="Mostrar u ocultar clave"
              >
                {mostrarClave ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', minHeight: '44px', fontSize: '15px' }}
            disabled={loading}
          >
            {loading ? 'Verificando acceso...' : 'Desbloquear Recetario (Enter)'}
          </button>
        </form>
      </div>
    </div>
  );
};

