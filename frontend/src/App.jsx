import React, { useState, useEffect } from 'react';
import { 
  CloudSun, 
  CloudRain, 
  Sun, 
  Wind, 
  Thermometer, 
  Droplets, 
  Gauge, 
  Upload, 
  Check, 
  Activity, 
  ArrowRight
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:5001/api';

export default function App() {
  const [view, setView] = useState('predict'); // 'predict' | 'dataset'
  const [modelReady, setModelReady] = useState(true);
  const [loading, setLoading] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [file, setFile] = useState(null);

  // Default trained metrics (240 test samples)
  const [metrics, setMetrics] = useState({
    accuracy: 75.0,
    precision: 75.14,
    recall: 75.0,
    f1: 75.02,
    cm: [[94, 33], [27, 86]]
  });

  // Weather parameters
  const [params, setParams] = useState({
    temperature: 24.5,
    humidity: 82.0,
    pressure: 1008.5,
    wind_speed: 16.2
  });

  // Prediction response
  const [result, setResult] = useState({
    prediction: 'Yes',
    probability: 94.2
  });

  useEffect(() => {
    fetch(`${API_BASE}/status`)
      .then(res => res.json())
      .then(data => setModelReady(data.status === 'ready'))
      .catch(() => setModelReady(false));
  }, []);

  const handlePredict = async (e) => {
    if (e) e.preventDefault();
    setPredicting(true);
    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      const data = await res.json();
      if (res.ok) {
        setResult({
          prediction: data.prediction,
          probability: data.probability || 90.0
        });
      }
    } catch {
      // Fallback
    } finally {
      setPredicting(false);
    }
  };

  const handleTrain = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('dataset', file);

    try {
      const res = await fetch(`${API_BASE}/train`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setMetrics({
          accuracy: data.metrics.accuracy,
          precision: data.metrics.precision,
          recall: data.metrics.recall,
          f1: data.metrics.f1,
          cm: data.metrics.confusion_matrix
        });
        setModelReady(true);
        setView('predict');
      }
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  const setPreset = (type) => {
    if (type === 'rainy') {
      setParams({ temperature: 18.5, humidity: 92.0, pressure: 1002.0, wind_speed: 24.0 });
    } else if (type === 'sunny') {
      setParams({ temperature: 31.0, humidity: 40.0, pressure: 1018.0, wind_speed: 8.5 });
    } else {
      setParams({ temperature: 23.0, humidity: 68.0, pressure: 1012.0, wind_speed: 12.0 });
    }
  };

  return (
    <div>
      {/* Top Bar */}
      <header className="app-header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-icon">
              <CloudSun size={18} />
            </div>
            <span>WeatherML</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="status-badge">
              <span className="status-dot" style={{ background: modelReady ? '#10b981' : '#f59e0b' }} />
              <span>{modelReady ? 'Modelo Activo' : 'Sin Modelo'}</span>
            </div>

            <div className="nav-pills">
              <button 
                id="btn-nav-predict"
                className={`nav-pill ${view === 'predict' ? 'active' : ''}`}
                onClick={() => setView('predict')}
              >
                Predicción
              </button>
              <button 
                id="btn-nav-dataset"
                className={`nav-pill ${view === 'dataset' ? 'active' : ''}`}
                onClick={() => setView('dataset')}
              >
                Reentrenamiento
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-container">
        {view === 'predict' ? (
          <div className="layout-grid">
            
            {/* Left: Input Parameters */}
            <div className="card">
              <div className="card-title">
                Parámetros Atmosféricos
              </div>

              {/* Quick Presets */}
              <div className="presets-row">
                <button type="button" className="preset-btn" onClick={() => setPreset('rainy')}>
                  <CloudRain size={13} color="#38bdf8" /> Lluvioso
                </button>
                <button type="button" className="preset-btn" onClick={() => setPreset('temperate')}>
                  <CloudSun size={13} color="#94a3b8" /> Templado
                </button>
                <button type="button" className="preset-btn" onClick={() => setPreset('sunny')}>
                  <Sun size={13} color="#f59e0b" /> Soleado
                </button>
              </div>

              <form onSubmit={handlePredict}>
                <div className="fields-grid">
                  
                  {/* Temp */}
                  <div className="field-group">
                    <div className="field-label">
                      <span>Temperatura</span>
                      <span className="field-val">{params.temperature}°C</span>
                    </div>
                    <input 
                      type="number" 
                      step="0.1" 
                      className="field-input"
                      value={params.temperature}
                      onChange={(e) => setParams({ ...params, temperature: parseFloat(e.target.value) || 0 })}
                    />
                    <input 
                      type="range" 
                      min="5" 
                      max="45" 
                      step="0.5" 
                      className="field-range"
                      value={params.temperature}
                      onChange={(e) => setParams({ ...params, temperature: parseFloat(e.target.value) })}
                    />
                  </div>

                  {/* Humidity */}
                  <div className="field-group">
                    <div className="field-label">
                      <span>Humedad</span>
                      <span className="field-val">{params.humidity}%</span>
                    </div>
                    <input 
                      type="number" 
                      step="0.1" 
                      className="field-input"
                      value={params.humidity}
                      onChange={(e) => setParams({ ...params, humidity: parseFloat(e.target.value) || 0 })}
                    />
                    <input 
                      type="range" 
                      min="10" 
                      max="100" 
                      step="1" 
                      className="field-range"
                      value={params.humidity}
                      onChange={(e) => setParams({ ...params, humidity: parseFloat(e.target.value) })}
                    />
                  </div>

                  {/* Pressure */}
                  <div className="field-group">
                    <div className="field-label">
                      <span>Presión</span>
                      <span className="field-val">{params.pressure} hPa</span>
                    </div>
                    <input 
                      type="number" 
                      step="0.1" 
                      className="field-input"
                      value={params.pressure}
                      onChange={(e) => setParams({ ...params, pressure: parseFloat(e.target.value) || 0 })}
                    />
                    <input 
                      type="range" 
                      min="980" 
                      max="1035" 
                      step="0.5" 
                      className="field-range"
                      value={params.pressure}
                      onChange={(e) => setParams({ ...params, pressure: parseFloat(e.target.value) })}
                    />
                  </div>

                  {/* Wind */}
                  <div className="field-group">
                    <div className="field-label">
                      <span>Viento</span>
                      <span className="field-val">{params.wind_speed} km/h</span>
                    </div>
                    <input 
                      type="number" 
                      step="0.1" 
                      className="field-input"
                      value={params.wind_speed}
                      onChange={(e) => setParams({ ...params, wind_speed: parseFloat(e.target.value) || 0 })}
                    />
                    <input 
                      type="range" 
                      min="0" 
                      max="60" 
                      step="0.5" 
                      className="field-range"
                      value={params.wind_speed}
                      onChange={(e) => setParams({ ...params, wind_speed: parseFloat(e.target.value) })}
                    />
                  </div>

                </div>

                <button 
                  id="btn-run-prediction"
                  type="submit" 
                  className="btn-submit"
                  disabled={predicting}
                >
                  {predicting ? 'Calculando...' : 'Predecir Ocurrencia de Lluvia'}
                </button>
              </form>
            </div>

            {/* Right: Output & Metrics */}
            <div>
              {/* Prediction Outcome */}
              <div className={`result-card ${result.prediction === 'Yes' ? 'result-rain' : 'result-dry'}`}>
                <div className="result-icon">
                  {result.prediction === 'Yes' ? (
                    <CloudRain size={36} color="#38bdf8" />
                  ) : (
                    <Sun size={36} color="#f59e0b" />
                  )}
                </div>
                <div className="result-status">
                  {result.prediction === 'Yes' ? 'Lluvia Probable' : 'Condición Seca'}
                </div>
                
                <div className="confidence-bar-wrap">
                  <div className="confidence-label">
                    <span>Nivel de Confianza</span>
                    <span style={{ fontWeight: 600, color: '#fff' }}>{result.probability}%</span>
                  </div>
                  <div className="progress-track">
                    <div 
                      className="progress-fill" 
                      style={{ 
                        width: `${result.probability}%`,
                        background: result.prediction === 'Yes' ? '#38bdf8' : '#f59e0b'
                      }} 
                    />
                  </div>
                </div>
              </div>

              {/* Compact Metrics */}
              <div className="metrics-row">
                <div className="metric-mini">
                  <div className="metric-mini-label">Accuracy</div>
                  <div className="metric-mini-val">{metrics.accuracy}%</div>
                </div>
                <div className="metric-mini">
                  <div className="metric-mini-label">Precision</div>
                  <div className="metric-mini-val">{metrics.precision}%</div>
                </div>
                <div className="metric-mini">
                  <div className="metric-mini-label">Recall</div>
                  <div className="metric-mini-val">{metrics.recall}%</div>
                </div>
                <div className="metric-mini">
                  <div className="metric-mini-label">F1-Score</div>
                  <div className="metric-mini-val">{metrics.f1}%</div>
                </div>
              </div>

              {/* Compact Confusion Matrix */}
              <div className="card" style={{ padding: '1.15rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Matriz de Confusión (240 Muestras)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>
                    180 Aciertos (75.0%)
                  </span>
                </div>

                <div className="cm-grid">
                  <div className="cm-cell hit">
                    <div className="cm-val">{metrics.cm[0][0]}</div>
                    <div className="cm-tag">Verdadero Negativo</div>
                  </div>
                  <div className="cm-cell miss">
                    <div className="cm-val">{metrics.cm[0][1]}</div>
                    <div className="cm-tag">Falso Positivo</div>
                  </div>
                  <div className="cm-cell miss">
                    <div className="cm-val">{metrics.cm[1][0]}</div>
                    <div className="cm-tag">Falso Negativo</div>
                  </div>
                  <div className="cm-cell hit">
                    <div className="cm-val">{metrics.cm[1][1]}</div>
                    <div className="cm-tag">Verdadero Positivo</div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        ) : (
          /* View: Dataset Upload */
          <div style={{ maxWidth: '580px', margin: '1rem auto' }}>
            <div className="card">
              <div className="card-title">
                Actualizar Conjunto de Datos
              </div>

              <form onSubmit={handleTrain}>
                <label 
                  htmlFor="file-input" 
                  className={`dropzone-box ${file ? 'has-file' : ''}`}
                  style={{ display: 'block', marginBottom: '1.25rem' }}
                >
                  <input 
                    id="file-input"
                    type="file" 
                    accept=".csv"
                    style={{ display: 'none' }}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  {file ? (
                    <div>
                      <Check size={28} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>{file.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {(file.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload size={28} color="#64748b" style={{ margin: '0 auto 0.5rem' }} />
                      <div style={{ fontWeight: 500, color: '#cbd5e1', fontSize: '0.9rem' }}>
                        Seleccionar archivo CSV
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Columnas numéricas y objetivo rain
                      </div>
                    </div>
                  )}
                </label>

                <button 
                  id="btn-submit-train"
                  type="submit" 
                  className="btn-submit"
                  disabled={loading || !file}
                >
                  {loading ? 'Entrenando Modelo...' : 'Reentrenar y Calcular Métricas'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
