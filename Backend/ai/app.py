from flask import Flask, request, jsonify, g
from flask_cors import CORS
import google.generativeai as genai
import os
import jwt
from functools import wraps
from dotenv import load_dotenv
from waitress import serve
import psycopg2
from psycopg2.extras import RealDictCursor
import traceback

load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app, supports_credentials=True)

# PostgreSQL Connection
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Fallback or error if not set. For now, we rely on the user providing it in .env
    print("⚠️ DATABASE_URL is missing in .env")

def get_db_connection():
    try:
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        return conn
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return None

GEMINI_API_KEY = os.getenv("GEMINI_API")
JWT_SECRET = os.getenv("JWT_SECRET")

if not GEMINI_API_KEY:
    raise ValueError("❌ GEMINI_API key is missing! Set it in the .env file.")

if not JWT_SECRET:
    raise ValueError("❌ JWT_SECRET is missing! Set it in the .env file.")

# Configure Gemini AI
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("models/gemini-2.5-flash")

# Helper function to fetch user names by ID
def get_user_name(user_id):
    conn = get_db_connection()
    if not conn:
        return "Unknown"
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT name FROM users WHERE id = %s", (user_id,))
            user = cur.fetchone()
            return user["name"] if user else "Unknown"
    except Exception as e:
        print(f"Error fetching user name: {e}")
        return "Unknown"
    finally:
        conn.close()

# Auth middleware function
def auth_middleware(roles=[]):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            token = request.cookies.get('jwt')
            
            if not token:
                auth_header = request.headers.get('Authorization')
                if auth_header and auth_header.startswith('Bearer '):
                    token = auth_header.split(' ')[1]
                else:
                    return jsonify({"message": "Unauthorized"}), 401
                
            try:
                decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"], options={"require": ["exp"]})

                g.user = {
                    "id": decoded.get('id'),
                    "role": decoded.get('role')
                }
                
                if roles and g.user.get('role') not in roles:
                    return jsonify({"message": "Access Denied"}), 403
                    
                return f(*args, **kwargs)
                
            except jwt.ExpiredSignatureError:
                return jsonify({"message": "Token expired"}), 401
            except jwt.InvalidTokenError as e:
                return jsonify({"message": f"Invalid token: {str(e)}"}), 403
            except Exception as e:
                return jsonify({"message": f"Internal Server Error: {str(e)}"}), 500
                
        return decorated_function
    return decorator

# Debug endpoint to test authentication
@app.route("/auth-test", methods=["GET"])
@auth_middleware([])
def auth_test():
    return jsonify({
        "message": "Authentication successful!",
        "user_id": g.user.get('id'),
        "role": g.user.get('role')
    })

@app.route("/ai/disease_prediction", methods=["POST"])
def disease_prediction():
    try:
        data = request.json
        symptoms = data.get("symptoms")

        if not symptoms:
            return jsonify({"error": "Symptoms are required"}), 400

        symptoms_text = ", ".join(symptoms)

        gemini_prompt = f"""
        A patient is experiencing the following symptoms: {symptoms_text}.
        Based on these symptoms, predict the most likely disease or condition.
        Provide a detailed explanation along with possible treatments.
        Do not include any technical terms, IDs, or unnecessary database details.
        """

        response = model.generate_content(gemini_prompt)
        final_prediction = response.text if response and response.text else "Gemini AI could not generate a prediction."

        return jsonify({"status": "success", "prediction": final_prediction})

    except Exception as e:
        print(f"Error in /disease_prediction: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


# ✅ AI-Powered Medical Record Retrieval
@app.route("/ai/ask_question", methods=["POST"])
@auth_middleware(["student"])
def ask_question():
    try:
        data = request.json
        user_question = data.get("question")
        if not user_question:
            return jsonify({"error": "Question is required"}), 400

        student_id = g.user.get('id')
        
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500

        try:
            with conn.cursor() as cur:
                # Fetch student name
                cur.execute("SELECT name FROM users WHERE id = %s", (student_id,))
                student = cur.fetchone()
                student_name = student["name"] if student else "Unknown Patient"

                # Fetch medical records
                cur.execute("""
                    SELECT hr.*, d.name as doctor_name 
                    FROM health_records hr 
                    LEFT JOIN users d ON hr.doctor_id = d.id 
                    WHERE hr.student_id = %s
                """, (student_id,))
                records = cur.fetchall()

                if not records:
                    enriched_records_text = "No medical history found for this patient."
                else:
                    enriched_records = []
                    for record in records:
                        doctor_name = record.get("doctor_name")
                        if not doctor_name:
                            doctor_name = record.get("external_doctor_name") or "Unknown Doctor"

                        enriched_records.append({
                            "Date": str(record.get("created_at", "Unknown")),
                            "Diagnosis": record.get("diagnosis", "Not specified"),
                            "Doctor": doctor_name,
                            "Treatment": record.get("treatment", "Not specified"),
                            "Prescription": record.get("prescription", "Not specified")
                        })
                    enriched_records_text = str(enriched_records)

        finally:
            conn.close()

        gemini_prompt = f"""
        You are assisting {student_name} with their medical history.
        Do **not** include any database-related terms, IDs, or unnecessary details.

        Patient: {student_name}

        Medical History:
        {enriched_records_text}

        Answer the following question in a natural and professional manner:
        "{user_question}"
        """

        try:
            response = model.generate_content(gemini_prompt)
            final_answer = response.text if response and hasattr(response, 'text') else "I couldn't generate an answer."
        except Exception as ai_error:
            print("Gemini API error:", ai_error)
            return jsonify({"error": "Failed to generate response using Gemini"}), 500

        return jsonify({"status": "success", "answer": final_answer})

    except Exception as e:
        print("Error in /ask_question:", e)
        traceback.print_exc()
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route("/ai/leaverelated", methods=["POST"])
@auth_middleware(["student"])
def leave_related_question():
    try:
        data = request.json
        user_question = data.get("question")
        student_id = g.user.get('id')

        if not user_question:
            return jsonify({"error": "Question is required"}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500

        try:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM medical_leaves WHERE student_id = %s", (student_id,))
                records = cur.fetchall()
                
                # Convert records to list of dicts (RealDictCursor does this, but we need to handle dates)
                formatted_records = []
                for r in records:
                    formatted_records.append({
                        "from_date": str(r.get("from_date")),
                        "to_date": str(r.get("to_date")),
                        "reason": r.get("reason"),
                        "status": r.get("status")
                    })
                
                records_text = str(formatted_records) if formatted_records else "No leave history found."
        finally:
            conn.close()

        gemini_prompt = f"""
        The following is the student's leave record history:
        {records_text}
        
        Based on this data, answer the following question:
        "{user_question}"
        """

        response = model.generate_content(gemini_prompt)
        final_answer = response.text if response and response.text else "Gemini AI could not generate an answer."

        return jsonify({"status": "success", "answer": final_answer})

    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

    

# ✅ AI-Powered Doctor Insights (Secure)
@app.route("/ai/doctor_insights", methods=["POST"])
@auth_middleware(["doctor"])
def doctor_insights():
    try:
        data = request.json
        user_question = data.get("question")
        doctor_id = g.user.get('id')

        if not user_question:
            return jsonify({"error": "Question is required"}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500

        try:
            with conn.cursor() as cur:
                # Fetch doctor details
                cur.execute("SELECT name FROM users WHERE id = %s", (doctor_id,))
                doctor = cur.fetchone()
                doctor_name = doctor["name"] if doctor else "Unknown Doctor"

                # Fetch available slots
                cur.execute("SELECT date_time FROM doctor_slots WHERE doctor_id = %s AND is_booked = FALSE", (doctor_id,))
                slots = cur.fetchall()
                free_slots = [str(slot["date_time"]) for slot in slots]

                # Fetch upcoming appointments
                cur.execute("""
                    SELECT a.slot_date_time, a.status, s.name as student_name 
                    FROM appointments a 
                    JOIN users s ON a.student_id = s.id 
                    WHERE a.doctor_id = %s
                """, (doctor_id,))
                appointments = cur.fetchall()
                
                enriched_appointments = []
                for appt in appointments:
                    enriched_appointments.append({
                        "Patient": appt["student_name"],
                        "DateTime": str(appt["slot_date_time"]),
                        "Status": appt["status"]
                    })

                # Fetch health records of treated patients
                cur.execute("""
                    SELECT hr.*, s.name as student_name 
                    FROM health_records hr 
                    JOIN users s ON hr.student_id = s.id 
                    WHERE hr.doctor_id = %s
                """, (doctor_id,))
                health_records = cur.fetchall()

                enriched_health_records = []
                for record in health_records:
                    enriched_health_records.append({
                        "Patient": record["student_name"],
                        "Diagnosis": record.get("diagnosis", "Not specified"),
                        "Treatment": record.get("treatment", "Not specified"),
                        "Prescription": record.get("prescription", "Not specified"),
                        "DateTime": str(record.get("created_at"))
                    })

        finally:
            conn.close()

        gemini_prompt = f"""
        You are assisting Dr. {doctor_name} with patient records.

        Available Appointment Slots:
        {free_slots}

        Your Upcoming Appointments:
        {enriched_appointments}

        Your Past Treatments:
        {enriched_health_records}

        Answer the following question:
        "{user_question}"
        """

        response = model.generate_content(gemini_prompt)
        final_answer = response.text if response and response.text else "I couldn't generate an answer."

        return jsonify({"status": "success", "answer": final_answer})

    except Exception as e:
        print(f"Doctor insights error: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

# Run Flask app
if __name__ == "__main__":
    serve(app, host="0.0.0.0", port=5000)
