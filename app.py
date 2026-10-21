from pathlib import Path

import joblib
import pandas as pd

from flask import Flask, render_template, request, flash, jsonify
from flask_cors import CORS
from sklearn.model_selection import train_test_split

from filtros import (
    LoadDatasetFilter,
    ValidateDatasetFilter,
    PrepareDataFilter,
    TrainModelFilter,
    EvaluateModelFilter
)

# Configuración de Flask
app = Flask(
    __name__,
    static_folder="public",
    static_url_path="/public"
)
CORS(app)

app.secret_key = "cambia-esta-clave-en-produccion"

# Configuración del modelo
MODEL_PATH = Path("models/weather_model.joblib")
MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)

TARGET = "rain"

@app.route("/", methods=["GET"])
def index():
    return render_template(
        "index.html",
        results=None,
        prediction_features=None,
        prediction_result=None
    )

@app.route("/train", methods=["POST"])
def train():
    uploaded = request.files.get("dataset")

    if uploaded is None or not uploaded.filename:
        flash("Selecciona un archivo CSV.")
        return index()

    if not uploaded.filename.lower().endswith(".csv"):
        flash("El archivo debe tener extensión .csv.")
        return index()

    try:
        # Filtro 1: carga del dataset
        raw = LoadDatasetFilter().run(uploaded.stream)

        # Filtro 2: validación
        validated = ValidateDatasetFilter(TARGET).run(raw)

        # Filtro 3: preparación de los datos
        X, y, info = PrepareDataFilter(TARGET).run(validated)

        # Separación de datos de entrenamiento y prueba
        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=0.20,
            random_state=42,
            stratify=y
        )

        # Filtro 4: entrenamiento
        model = TrainModelFilter().run(
            X_train,
            y_train,
            info
        )

        # Filtro 5: evaluación
        metrics = EvaluateModelFilter().run(
            model,
            X_test,
            y_test
        )

        # Guardar modelo y configuración
        joblib.dump(
            {
                "model": model,
                "features": list(X.columns),
                "target": info["target"]
            },
            MODEL_PATH
        )

        results = {
            "rows": len(validated),
            "features": len(X.columns),
            "target": info["target"],
            "class_distribution": {
                str(key): int(value)
                for key, value in y.value_counts().items()
            },
            "metrics": metrics,
            "model_path": str(MODEL_PATH)
        }

        return render_template(
            "index.html",
            results=results,
            prediction_features=list(X.columns),
            prediction_result=None
        )

    except Exception as exc:
        app.logger.exception("Error durante el entrenamiento")
        flash(f"No se pudo procesar el dataset: {exc}")
        return index()

@app.route("/predict", methods=["POST"])
def predict():
    if not MODEL_PATH.exists():
        flash("Primero entrena un modelo subiendo un dataset.")
        return index()

    try:
        saved = joblib.load(MODEL_PATH)

        features = saved["features"]
        model = saved["model"]

        values = {}

        for feature in features:
            raw_value = request.form.get(feature, "").strip()

            if raw_value == "":
                raise ValueError(
                    f"El campo '{feature}' es obligatorio."
                )

            # Convertir a número cuando corresponda.
            try:
                values[feature] = float(raw_value)
            except ValueError:
                values[feature] = raw_value

        sample = pd.DataFrame(
            [values],
            columns=features
        )

        prediction = model.predict(sample)[0]

        probability = None

        if hasattr(model, "predict_proba"):
            probabilities = model.predict_proba(sample)[0]
            probability = round(
                float(max(probabilities)) * 100,
                2
            )

        prediction_result = {
            "label": str(prediction),
            "probability": probability
        }

        return render_template(
            "index.html",
            results=None,
            prediction_features=features,
            prediction_result=prediction_result
        )

    except Exception as exc:
        app.logger.exception("Error durante la predicción")
        flash(f"No se pudo generar la predicción: {exc}")
# ========================================================
# ENDPOINTS API REST (Para Frontend React + Vite)
# ========================================================

@app.route("/api/status", methods=["GET"])
def api_status():
    """Verifica si el modelo está entrenado y listo para predicciones."""
    if not MODEL_PATH.exists():
        return jsonify({
            "status": "not_trained",
            "message": "Modelo no entrenado aún. Sube un dataset para comenzar."
        }), 200
    try:
        saved = joblib.load(MODEL_PATH)
        return jsonify({
            "status": "ready",
            "features": saved.get("features", []),
            "target": saved.get("target", "rain"),
            "model_path": str(MODEL_PATH)
        }), 200
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500

@app.route("/api/train", methods=["POST"])
def api_train():
    """Ejecuta el pipeline de filtros de Pipes and Filters y devuelve métricas en JSON."""
    uploaded = request.files.get("dataset")

    if uploaded is None or not uploaded.filename:
        return jsonify({"error": "Selecciona un archivo CSV válido."}), 400

    if not uploaded.filename.lower().endswith(".csv"):
        return jsonify({"error": "El archivo debe tener extensión .csv."}), 400

    try:
        # Filtro 1: carga del dataset
        raw = LoadDatasetFilter().run(uploaded.stream)

        # Filtro 2: validación
        validated = ValidateDatasetFilter(TARGET).run(raw)

        # Filtro 3: preparación de los datos
        X, y, info = PrepareDataFilter(TARGET).run(validated)

        # Separación de datos de entrenamiento y prueba
        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=0.20,
            random_state=42,
            stratify=y
        )

        # Filtro 4: entrenamiento
        model = TrainModelFilter().run(
            X_train,
            y_train,
            info
        )

        # Filtro 5: evaluación
        metrics = EvaluateModelFilter().run(
            model,
            X_test,
            y_test
        )

        # Guardar modelo y configuración
        joblib.dump(
            {
                "model": model,
                "features": list(X.columns),
                "target": info["target"]
            },
            MODEL_PATH
        )

        return jsonify({
            "status": "ok",
            "rows": len(validated),
            "features": list(X.columns),
            "target": info["target"],
            "class_distribution": {
                str(key): int(value)
                for key, value in y.value_counts().items()
            },
            "metrics": metrics,
            "model_path": str(MODEL_PATH)
        }), 200

    except Exception as exc:
        app.logger.exception("Error en api_train")
        return jsonify({"error": f"Error al procesar el dataset: {exc}"}), 500

@app.route("/api/predict", methods=["POST"])
def api_predict():
    """Genera una predicción recibiendo las variables en formato JSON."""
    if not MODEL_PATH.exists():
        return jsonify({"error": "Primero entrena un modelo subiendo un dataset."}), 400

    try:
        saved = joblib.load(MODEL_PATH)
        features = saved["features"]
        model = saved["model"]

        # Aceptar tanto JSON como form-data
        data = request.get_json(silent=True) or request.form

        values = {}
        for feature in features:
            if feature not in data:
                return jsonify({"error": f"El campo '{feature}' es obligatorio."}), 400
            
            raw_value = str(data[feature]).strip()
            if raw_value == "":
                return jsonify({"error": f"El campo '{feature}' no puede estar vacío."}), 400

            try:
                values[feature] = float(raw_value)
            except ValueError:
                values[feature] = raw_value

        sample = pd.DataFrame([values], columns=features)
        prediction = model.predict(sample)[0]

        probability = None
        probabilities_dict = {}
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(sample)[0]
            probability = round(float(max(probs)) * 100, 2)
            classes = list(model.classes_)
            probabilities_dict = {
                str(cls): round(float(p) * 100, 2)
                for cls, p in zip(classes, probs)
            }

        return jsonify({
            "status": "ok",
            "prediction": str(prediction),
            "probability": probability,
            "probabilities": probabilities_dict,
            "features_used": values
        }), 200

    except Exception as exc:
        app.logger.exception("Error en api_predict")
        return jsonify({"error": f"Error al generar la predicción: {exc}"}), 500

if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5001,
        debug=True
    )
