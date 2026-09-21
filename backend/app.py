import os
from dotenv import load_dotenv

# Load backend environment variables from .env
load_dotenv()

from flask import Flask, request, jsonify
from flask_cors import CORS
from analyzer import extract_document_text, calculate_ats_match
from optimizer import (
    generate_gemini_optimizer_analysis_with_timeout,
    generate_rule_based_optimizer_analysis
)
from interview import (
    generate_grounded_interview_questions,
    evaluate_interview_answer,
    generate_final_interview_report
)


app = Flask(__name__)
CORS(app)

@app.route('/api/health', methods=['GET'])
def health_check():
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    is_gemini_configured = bool(gemini_key and gemini_key != "your_gemini_api_key_here")
    return jsonify({
        "status": "ok",
        "message": "ResuCraft AI backend is running",
        "gemini_configured": is_gemini_configured
    })


@app.route('/api/analyze', methods=['POST'])
def analyze_resume():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No resume file uploaded in request."}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected."}), 400

        job_description = request.form.get('job_description', '').strip()
        if not job_description:
            return jsonify({"error": "Job description is required for analysis."}), 400

        file_bytes = file.read()
        if len(file_bytes) == 0:
            return jsonify({"error": "Uploaded document is empty."}), 400

        # Extract plain text from PDF or DOCX
        resume_text = extract_document_text(file_bytes, file.filename)
        if not resume_text or not resume_text.strip():
            return jsonify({
                "error": "Could not extract readable text from document. Please ensure your PDF or DOCX file is not scanned/image-only."
            }), 400

        # Compute fast ML ATS match analysis
        analysis_result = calculate_ats_match(resume_text, job_description)
        analysis_result["raw_resume_text"] = resume_text

        return jsonify({
            "status": "success",
            "filename": file.filename,
            "raw_resume_text": resume_text,
            "data": analysis_result
        }), 200

    except Exception as e:
        return jsonify({"error": f"An error occurred during resume analysis: {str(e)}"}), 500


@app.route('/api/optimize-full', methods=['POST'])
def optimize_full_endpoint():
    try:
        data = request.get_json() or {}
        resume_text = data.get("resume_text", "")
        jd_text = data.get("jd_text", "")
        analysis_data = data.get("analysis_data", {})

        result = generate_gemini_optimizer_analysis_with_timeout(
            analysis_data=analysis_data,
            resume_text=resume_text,
            jd_text=jd_text,
            timeout_seconds=8.0
        )

        if result is None:
            result = generate_rule_based_optimizer_analysis(
                analysis_data=analysis_data,
                resume_text=resume_text,
                jd_text=jd_text
            )

        return jsonify({"status": "success", "optimizer_results": result}), 200

    except Exception as e:
        return jsonify({"error": f"Error generating Gemini optimization: {str(e)}"}), 500


@app.route('/api/interview/generate-questions', methods=['POST'])
def generate_interview_questions_endpoint():
    try:
        data = request.get_json() or {}
        resume_text = str(data.get("resume_text", "") or "").strip()
        interview_type = data.get("interview_type", "mixed").lower()
        difficulty = data.get("difficulty", "medium").lower()
        num_questions = int(data.get("num_questions", 5))

        if not resume_text or len(resume_text) < 20:
            return jsonify({"error": "Valid candidate resume_text is required for generating interview questions."}), 400

        questions = generate_grounded_interview_questions(
            resume_text=resume_text,
            interview_type=interview_type,
            difficulty=difficulty,
            num_questions=num_questions
        )

        return jsonify({
            "status": "success",
            "questions": questions,
            "total_generated": len(questions)
        }), 200

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Error generating interview questions: {str(e)}"}), 500


@app.route('/api/interview/evaluate-answer', methods=['POST'])
def evaluate_interview_answer_endpoint():
    try:
        data = request.get_json() or {}
        question_text = data.get("question_text", "").strip()
        candidate_answer = str(data.get("candidate_answer", "") or "").strip()
        resume_text = data.get("resume_text", "").strip()
        interview_type = data.get("interview_type", "mixed").lower()
        difficulty = data.get("difficulty", "medium").lower()
        is_follow_up = bool(data.get("is_follow_up", False))

        if not question_text:
            return jsonify({"error": "question_text is required."}), 400

        evaluation = evaluate_interview_answer(
            question_text=question_text,
            candidate_answer=candidate_answer,
            resume_text=resume_text,
            interview_type=interview_type,
            difficulty=difficulty,
            is_follow_up=is_follow_up
        )

        return jsonify({
            "status": "success",
            "evaluation": evaluation
        }), 200

    except Exception as e:
        return jsonify({"error": f"Error evaluating interview answer: {str(e)}"}), 500


@app.route('/api/interview/finalize', methods=['POST'])
def finalize_interview_endpoint():
    try:
        data = request.get_json() or {}
        interview_type = data.get("interview_type", "mixed").lower()
        difficulty = data.get("difficulty", "medium").lower()
        num_questions = int(data.get("num_questions", 5))
        transcript = data.get("transcript", [])

        if not transcript or not isinstance(transcript, list):
            return jsonify({"error": "transcript array is required to finalize interview."}), 400

        final_report = generate_final_interview_report(
            interview_type=interview_type,
            difficulty=difficulty,
            num_questions=num_questions,
            transcript=transcript
        )

        return jsonify({
            "status": "success",
            "report_data": final_report
        }), 200

    except Exception as e:
        return jsonify({"error": f"Error finalizing interview report: {str(e)}"}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)








