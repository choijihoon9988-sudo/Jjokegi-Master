// choijihoon9988-sudo/jjokegi-master/Jjokegi-Master-cf08a48a234322a7392f340a45fdc977e1ba0e13/script.js
// [v4.11] PDF 한글 깨짐 문제 해결 (확실한 방법)
// - handleDownloadPDF 함수에 .ttf 폰트 파일을 직접 fetch/Base64 변환 후 VFS에 등록하는 로직 추가
// [v4.10] PDF 한글 깨짐 수정: handleDownloadPDF 함수에 setFont('NanumGothic') 추가
// [v4.9] PDF 저장 기능 (B안) 적용: AI가 문단 나눈 원본 텍스트를 1페이지에 삽입
// [v4.9] SPLIT_PROMPT 수정 (Array -> Object 반환: { chunks: [], formatted_text: "..." })
// [v4.9] handleStartSplit 수정 (AI 객체 응답 파싱)
// [v4.9] handleDownloadPDF 수정 (1페이지 텍스트 삽입)
// [v4.6] 요청 1: 프로그레스 바 기능 적용 (JS)
// [v4.6] 요청 2: 아코디언 헤더 텍스트 토글 기능 적용 (JS)
// [v4.5] API 400 오류 수정 (safetySettings 오타)
// --- AI CONFIGURATION ---
        // !!! 중요 !!!: 테스트를 위해 실제 Google AI Studio에서 발급받은 API 키를 "..." 안에 붙여넣으세요.
        const GEMINI_API_KEY = "AIzaSyCVTLte-n_F-83vTq3P1Fc16NzGXdKaIYI"; // ⬅️ 여기에 실제 API 키를 입력하세요.
        const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        // 만약 키가 없다면, [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) 에서 생성할 수 있습니다.
        
        // --- [v3.0] S-Class AI Prompts ---

        // --- 1. '해부학자' 프롬프트 (SPLIT_PROMPT v3.1 - B안 적용) ---
        const SPLIT_PROMPT = (text, mode) => {
            const coreInstruction = `
                You are 'The Scalpel', a master marketer and the author of 'Jjokegi Theory'. Your task is to dissect the provided text from a strategic marketing perspective.
                Your mission is to deconstruct the text into its 'Minimum Viable Meaning Units' (전략적 최소 의미 단위).
                A 'Meaning Unit' is NOT a simple sentence. It is a strategic chunk that serves one of the following purposes:
                - A psychological hook that targets a customer's core instinct or desire (e.g., LF8).
                - A sentence or phrase that proactively eliminates an anticipated customer rebuttal (반박 제거).
                - A problem-solution pair (문제 제기 및 해결책 암시).
                - A clear contrast or conflict (대립 구도).
                - A specific detail (visual, auditory) designed to evoke anxiety or curiosity.
            `;

            const modeInstruction = mode === 'quick'
               ? "After analyzing the *entire* text, extract *only* the 5 *most strategically important* meaning units from anywhere in the text. Do not just take the first 5."
               : (mode === 'medium'
                    ? "After analyzing the *entire* text, extract *only* the 10 *most strategically important* meaning units from anywhere in the text. Do not just take the first 10."
                    : "Deconstruct the *entire* text into *all* its strategic meaning units, in the order they appear.");

            // [v4.9] B안 적용: 2가지 업무(chunks, formatted_text) 요청 및 JSON 객체 반환
            const outputInstruction = `
                Your output MUST be a single, raw JSON object with no other text, commentary, or explanation.
                The object MUST have two keys:

                1.  \`chunks\`: A JSON array of strings containing the 'Meaning Units' based on the \`${mode}\` instruction.
                2.  \`formatted_text\`: The *entire* original text, but with \`\\n\\n\` (double line breaks) inserted at *logically appropriate* points to maximize readability for later review.
                    - Your goal is to create natural, readable paragraphs.
                    - If the original text is a single block without line breaks, you MUST analyze the content and insert \`\\n\\n\` based on topic shifts or logical breaks.
                    - If the original text already has \`\\n\` or \`\\n\\n\`, respect this structure but ensure the *final* output *only* uses \`\\n\\n\` for separation.
                
                Example Output Structure:
                {
                  "chunks": ["Strategic chunk 1.", "Strategic chunk 2."],
                  "formatted_text": "This is the full original text.\\n\\nBut I have inserted a logical paragraph break here.\\n\\nAnd another one here."
                }
            `;
            
            return `${coreInstruction}\n\n${modeInstruction}\n\n${outputInstruction}\n\nText to analyze:\n"""${text}"""\n\nOutput only the JSON object.`;
        };

        // --- 2. 'S급 코치' 프롬프트 (FEEDBACK_PROMPT v3.0) ---
        const FEEDBACK_PROMPT = (userAnalyses) => {
            return `
                You are an S-Class Senior Marketer at 'Isanghan Marketing', a 'Jjokegi Theory' master. Your task is to act as an S-Class Coach providing a detailed 1:1 code review for a junior marketer's training submission.
                Your feedback must be mercilessly sharp, logical, and strategic, but ultimately **constructive and motivational**, aimed at fostering rapid **growth**. Do not be polite or vague. Be direct and analytical, **focusing on growth opportunities**.
                **All output text (summaries, plans, feedback) MUST be in KOREAN and contain NO markdown.**

                You will evaluate the user's submitted 'thought process' (user_analysis) for each 'original_chunk' based on 4 S-Class criteria:
                1.  **[본능/욕망]:** Did the analysis pierce through to the customer's core 'instinct' (fear, desire, LF8)?
                2.  **[반박 제거]:** Did the analysis clearly define the customer's 'core rebuttal' and logically analyze how the text neutralizes it?
                3.  **[전략적 의도]:** Did the analysis identify the 'strategic intent' (e.g., Barnum effect, framing, authority) or just the superficial meaning?
                4.  **[고객 성공]:** Did the analysis connect this chunk to the ultimate goal of 'customer success' (conversion, sales)?

                **Your process:**
                1.  Iterate through the *entire* \`userAnalyses\` array.
                2.  For **EACH** item, generate a \`specific_feedback\` string in KOREAN, using the 4 S-Class criteria.
                3.  This feedback **MUST** use the keywords \`[강점]\` and \`[개선점]\` to be compatible with the UI.
                    (e.g., "[강점] '본능'을 언급한 점은 좋습니다. [개선점] 하지만 '어떤' 본능인지, '왜' 자극하는지 분석이 빠졌습니다. 더 쪼개십시오.")
                4.  After reviewing all items, generate the overall summary:
                    * \`score\`: An overall integer score (0-100) based on the 4 criteria.
                    * \`summary_good_points\`: An array of 2-3 strings (KOREAN) summarizing the main strengths **of the user's *analyses***.
                    * \`summary_improvement_points\`: An array of 2-3 strings (KOREAN) summarizing the biggest weaknesses **of the user's *analyses***. (e.g., "'반박 제거' 논리 분석이 전반적으로 부족함.")
                    * \`personalized_action_plan\`: A single string (KOREAN) proposing a *specific, actionable* next training goal. (Note: This is used for the *deleted* 'action plan' placeholder, but is still useful for the AI's internal logic).

                **Your output MUST be a single, raw JSON object in the following structure. Do not add any other text, markdown, or commentary.**

                {
                  "score": 0,
                  "summary_good_points": [],
                  "summary_improvement_points": [],
                  "personalized_action_plan": "",
                  "detailed_review": [
                    {
                      "original_chunk": "...",
                      "user_analysis": "...",
                      "specific_feedback": "..."
                    }
                  ]
                }

                **User's Analyses to evaluate:**
                ${JSON.stringify(userAnalyses, null, 2)}
            `;
        };
        
        // --- 3. '개인 교사' 프롬프트 (GROWTH_PROMPT v1.0) ---
        const GROWTH_PROMPT = (originalText, analysesJSON, feedbackJSON) => {
            return `
                You are a 'Master Coach', the world's top marketing strategist who prescribes personalized growth plans.

                **Student Data:**
                You will analyze the following data from a student's 'Jjokegi' training session.
                
                1. [Student's Original Text]:
                """${originalText}"""

                2. [Student's Thought Analysis (JSON)]:
                ${analysesJSON}

                3. [S-Class Coach's 1st Feedback (JSON)]:
                ${feedbackJSON}

                **Your Task (in KOREAN):**
                Your task is to act as a 'Personal Teacher' and provide a personalized prescription for this student's growth.

                1.  **Diagnose the "One Thing":** Based on all 3 data points (especially the 'summary_improvement_points' in the feedback), diagnose the *single most critical weakness* this student has.
                2.  **Prescribe the "One Theory":** Select the *single most important theory* or *marketing principle* the student must master to fix this weakness.
                3.  **Write a "Personalized Textbook" (3,000-5,000 words):**
                    Write a comprehensive, personalized textbook for this student in KOREAN. It MUST follow this structure:

                    ---
                    **[서문: 당신을 위한 진단서]**
                    내가 당신의 훈련 데이터 3가지를 모두 분석한 결과, 당신의 가장 치명적인 약점은 '{약점}'입니다.
                    이 문제를 해결하기 위해, 당신에게는 '{이론}'의 체화가 필요합니다.
                    이 처방전은 오직 당신만을 위해 작성되었습니다.

                    **[1챕터: '{이론}'의 정의와 본질]**
                    - 이 이론의 핵심 정의를 한 문장으로 내리십시오.
                    - 이 이론을 40자 내외의 비유로 설명하십시오.
                    - 이 이론이 왜 S급 마케터에게 필수적인지 그 이유를 설명하십시오.

                    **[2챕터: 당신의 분석이 실패한 이유 (사례 분석)]**
                    - 학생의 '사고 분석'({analysesJSON})에서 부족한 부분을 *직접 인용*하십시오.
                    - '{이론}'의 관점에서 이 분석이 왜 S급이 아닌지, 왜 본질을 놓쳤는지 신랄하게 해부하십시오.
                    - S급 코치의 피드백({feedbackJSON})을 근거로 이 분석의 문제점을 재확인시키십시오.

                    **[3챕터: S급 마케터는 이렇게 적용한다 (모범 답안)]**
                    - 학생의 '원본 텍스트'({originalText})를 이 '{이론}'에 맞춰 다시 분석하십시오.
                    - "나라면 이 텍스트를 이렇게 쪼개고, 이렇게 분석했을 것이다"라는 S급 모범 답안을 3-5개의 핵심 유닛에 대해 제시하십시오.

                    **[4챕터: 당신을 위한 다음 훈련 계획 (Action Plan)]**
                    - 이 '{이론}'을 당신의 '무의식적인 무기'로 만들기 위해, 다음 훈련에서 의식적으로 시도해야 할 '단 하나의 실천 과제'를 제시하십시오.
                    ---
            `;
        };
        // --- [END v3.0] S-Class AI Prompts ---


        // --- [v4.0] DOM Elements (단계별 UI 반영) ---
        const inputSection = document.getElementById('input-section');
        const courseSection = document.getElementById('course-section'); // [v4.0] NEW
        const analysisSection = document.getElementById('analysis-section');
        const feedbackReportSection = document.getElementById('feedback-report-section');
        
        const errorBanner = document.getElementById('error-banner');
        const errorMessage = document.getElementById('error-message');
        const errorClose = document.getElementById('error-close');
        const dynamicLoader = document.getElementById('dynamic-loader');
        const loaderText = document.getElementById('loader-text');

        const textInput = document.getElementById('text-input');
        const charCounter = document.getElementById('char-counter');
        const nextToCourseButton = document.getElementById('next-to-course-button'); // [v4.0] NEW
        const backToInputButton = document.getElementById('back-to-input-button'); // [v4.0] NEW

        const courseOptionsContainer = document.querySelector('.course-options');
        const courseOptions = document.querySelectorAll('.course-option');
        const startSplitButton = document.getElementById('start-split-button');
        
        const analysisInputsContainer = document.getElementById('analysis-inputs');
        
        // [v4.6] 요청 1: 프로그레스 바 UI 요소로 변경
        const progressPercentage = document.getElementById('progress-percentage');
        const progressCount = document.getElementById('progress-count');
        const progressBarForeground = document.getElementById('progress-bar-foreground');

        const nextChunkButton = document.getElementById('next-chunk-button');
        const prevChunkButton = document.getElementById('prev-chunk-button'); // [v4.1] NEW
        
        const resetButton = document.getElementById('reset-button');
        const downloadPdfButton = document.getElementById('download-pdf-button');
        const generatePromptButton = document.getElementById('generate-prompt-button');

        const feedbackScoreEl = document.getElementById('feedback-score');
        const feedbackSummaryEl = document.getElementById('feedback-summary');
        const detailedReviewContainer = document.getElementById('detailed-review-container');
        const goodPointsList = document.getElementById('good-points-list');
        const improvementPointsList = document.getElementById('improvement-points-list');
        
        // --- [v3.0] 전역 상태 변수 업데이트 ---
        let selectedCourse = null;
        let originalChunks = [];
        let userAnalyses = [];
        let currentChunkIndex = 0;
        let loaderInterval = null;
        let lastFeedback = null;
        let originalText = "";
        let formattedOriginalText = ""; // [v4.9] B안: AI가 문단 나눈 텍스트 저장용

        // --- [v4.0] Event Listeners (단계별 UI 반영) ---
        textInput.addEventListener('input', () => {
            updateButtonState();
            updateCharCounter();
        });
        errorClose.addEventListener('click', () => errorBanner.classList.add('hidden'));

        // [v4.0] 1단계 -> 2단계 이동
        nextToCourseButton.addEventListener('click', () => {
            inputSection.classList.add('hidden');
            courseSection.classList.remove('hidden');
            window.scrollTo(0, 0);
        });

        // [v4.0] 2단계 -> 1단계 이동
        backToInputButton.addEventListener('click', () => {
            courseSection.classList.add('hidden');
            inputSection.classList.remove('hidden');
            window.scrollTo(0, 0);
        });

        courseOptions.forEach(option => {
            option.addEventListener('click', () => {
                courseOptions.forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                selectedCourse = option.dataset.course;
                updateButtonState(); // [v4.0] 2단계 버튼 상태 업데이트
            });
        });

        startSplitButton.addEventListener('click', handleStartSplit);
        nextChunkButton.addEventListener('click', handleNextChunk);
        prevChunkButton.addEventListener('click', handlePrevChunk); // [v4.1] NEW
        resetButton.addEventListener('click', resetUI);
        downloadPdfButton.addEventListener('click', handleDownloadPDF);
        generatePromptButton.addEventListener('click', handleGeneratePrompt);


        // --- Core Functions ---

        function showError(message) {
            errorMessage.textContent = safeHtml(message);
            errorBanner.classList.remove('hidden');
            window.scrollTo(0, 0);
        }

        function updateCharCounter() {
            const length = textInput.value.length;
            charCounter.textContent = `${length} / 50자`;
            charCounter.classList.toggle('sufficient', length >= 50);
        }

        // [v4.0] 버튼 상태 업데이트 (단계별)
        function updateButtonState() {
            // 1단계 (텍스트 입력) 버튼
            const isTextSufficient = textInput.value.trim().length >= 50;
            nextToCourseButton.disabled = !isTextSufficient;

            // 2단계 (코스 선택) 버튼
            startSplitButton.disabled = !(isTextSufficient && selectedCourse);
        }

        function showDynamicLoader(messages = ["처리 중입니다..."]) {
            let messageIndex = 0;
            loaderText.textContent = messages[messageIndex];
            if (loaderInterval) clearInterval(loaderInterval);
            loaderInterval = setInterval(() => {
                messageIndex = (messageIndex + 1) % messages.length;
                loaderText.textContent = messages[messageIndex];
            }, 2500);
            dynamicLoader.classList.remove('hidden');
        }

        function hideDynamicLoader() {
            if (loaderInterval) clearInterval(loaderInterval);
            loaderInterval = null;
            dynamicLoader.classList.add('hidden');
        }

        // [v2.0] 훈련 시작 (쪼개기)
        // [v4.9] B안: AI 응답을 객체로 받고, formatted_text 저장
        async function handleStartSplit() {
            const text = textInput.value.trim();
            // [v4.0] 유효성 검사는 1, 2단계에서 이미 처리되었지만, 방어 코드 유지
            if (text.length < 50) {
                 showError("훈련할 텍스트를 50자 이상 입력하세요.");
                 return;
            }
            if (!selectedCourse) {
                showError("훈련 코스를 선택해주세요.");
                return;
            }

            originalText = text; // [v4.9] 원본은 여전히 저장 (GROWTH_PROMPT 용)
            formattedOriginalText = ""; // [v4.9] 초기화

            startSplitButton.disabled = true;
            startSplitButton.textContent = 'AI가 쪼개는 중...';
            // [v4.0] 2단계(코스 선택) 섹션을 숨김
            courseSection.classList.add('hidden'); 
            showDynamicLoader([
                "AI가 텍스트를 분석 중입니다...",
                "최소 의미 단위로 쪼개고 있습니다...",
                "AI가 가독성을 위해 문단을 나누고 있습니다...", // [v4.9] B안: 로더 메시지 추가
                "S-Class 훈련을 준비 중입니다..."
            ]);
            errorBanner.classList.add('hidden');

            try {
                // [v4.9] B안: 응답을 객체로 받음
                const response = await callGeminiApi(SPLIT_PROMPT(text, selectedCourse));
                
                // [v4.9] B안: 응답 객체 유효성 검사
                if (!response || !response.chunks || typeof response.formatted_text === 'undefined') {
                    throw new Error("AI 응답 형식이 올바르지 않습니다. (chunks 또는 formatted_text 누락)");
                }

                originalChunks = response.chunks;
                formattedOriginalText = response.formatted_text; // [v4.9] B안: AI가 문단 나눈 텍스트 저장
                
                userAnalyses = new Array(originalChunks.length).fill(null);
                currentChunkIndex = 0;
                
                displayCurrentChunk();
                
                analysisSection.classList.remove('hidden');
            } catch (error) {
                console.error('Error splitting text:', error);
                showError(`텍스트를 쪼개는 중 오류가 발생했습니다: ${error.message}`);
                // [v4.0] 실패 시 2단계(코스 선택) 섹션으로 복귀
                courseSection.classList.remove('hidden');
            } finally {
                startSplitButton.disabled = false;
                startSplitButton.textContent = '쪼개기 훈련 시작';
                hideDynamicLoader();
            }
        }

        // [v2.0] 현재 훈련 청크 표시 (포커스 모드 UI)
        // [v4.6] 요청 1: 프로그레스 바 로직 적용
        function displayCurrentChunk() {
            if (currentChunkIndex >= originalChunks.length) return;

            const chunk = originalChunks[currentChunkIndex];
            const savedAnalysis = userAnalyses[currentChunkIndex]?.user_analysis || '';
            const safeChunk = safeHtml(chunk);

            analysisInputsContainer.innerHTML = `
                <div class="chunk-card">
                    <div class="original-text-container">
                        <h4>📄 훈련 #${currentChunkIndex + 1}</h4>
                        <p class="original-text">${safeChunk}</p>
                    </div>
                    <div class="analysis-input-container">
                        <h4>나의 훈련: 사고 분석</h4>
                        <textarea class="analysis-input" data-index="${currentChunkIndex}" placeholder="이 문장을 쓴 의도는 무엇인가?\n고객의 어떤 반박을 제거하려 했는가?\n어떤 심리학적 원리를 사용했는가?">${safeHtml(savedAnalysis)}</textarea>
                    </div>
                </div>
            `;
            
            // [v4.6] 요청 1: 프로그레스 바 업데이트
            const totalChunks = originalChunks.length;
            // 현재 인덱스(currentChunkIndex)가 0부터 시작하므로, '완료된' 항목 수는 currentChunkIndex와 동일.
            const completedChunks = currentChunkIndex; 
            const percentage = totalChunks > 0 ? Math.round((completedChunks / totalChunks) * 100) : 0;
            
            progressPercentage.textContent = `${percentage}% 완료`;
            progressCount.textContent = `(${completedChunks} / ${totalChunks})`;
            progressBarForeground.style.width = `${percentage}%`;


            if (currentChunkIndex === originalChunks.length - 1) {
                nextChunkButton.textContent = '결과 리포트 보기';
            } else {
                nextChunkButton.textContent = '다음 ➔';
            }

            // [v4.1] 요청 1: '이전' 버튼 표시/숨김 로직
            if (currentChunkIndex > 0) {
                prevChunkButton.classList.remove('hidden');
            } else {
                prevChunkButton.classList.add('hidden');
            }
        }

        // [v4.1] 요청 1: 이전 훈련 항목으로 이동
        function handlePrevChunk() {
            // 현재 내용을 저장 (유효성 검사 없음)
            const currentTextarea = analysisInputsContainer.querySelector('.analysis-input');
            const analysisText = currentTextarea.value.trim();
            
            userAnalyses[currentChunkIndex] = {
                original_chunk: originalChunks[currentChunkIndex],
                user_analysis: analysisText
            };
            
            // 인덱스 감소
            if (currentChunkIndex > 0) {
                currentChunkIndex--;
                displayCurrentChunk();
                window.scrollTo(0, 0);
            }
        }

        // [v2.0] 다음 훈련 / 리포트 제출
        function handleNextChunk() {
            const currentTextarea = analysisInputsContainer.querySelector('.analysis-input');
            const analysisText = currentTextarea.value.trim();
            
            userAnalyses[currentChunkIndex] = {
                original_chunk: originalChunks[currentChunkIndex],
                user_analysis: analysisText
            };

            currentTextarea.classList.remove('invalid');
            if (!analysisText) {
                currentTextarea.classList.add('invalid');
                showError('사고 분석을 입력해주세요.');
                return;
            }
            errorBanner.classList.add('hidden');


            if (currentChunkIndex < originalChunks.length - 1) {
                currentChunkIndex++;
                displayCurrentChunk();
                window.scrollTo(0, 0);
            } else {
                handleGetFeedback();
            }
        }

        // [v2.0] 피드백 받기
        async function handleGetFeedback() {
            const allFilled = userAnalyses.every(analysis => analysis && analysis.user_analysis.trim().length > 0);
            
            if (!allFilled) {
                showError('모든 사고 분석을 입력해주세요. 누락된 항목이 있습니다.');
                const firstEmptyIndex = userAnalyses.findIndex(a => !a || !a.user_analysis.trim());
                if(firstEmptyIndex !== -1) {
                    currentChunkIndex = firstEmptyIndex;
                    displayCurrentChunk();
                    setTimeout(() => {
                         const textarea = analysisInputsContainer.querySelector('.analysis-input');
                         if(textarea) textarea.classList.add('invalid');
                    }, 100);
                }
                return;
            }

            nextChunkButton.disabled = true;
            nextChunkButton.textContent = '리포트 생성 중...';
            analysisSection.classList.add('hidden');
            showDynamicLoader([
                "S-Class 코치가 리포트를 생성 중입니다...",
                "모든 훈련 내용을 정밀 채점 중입니다...",
                "1:1 맞춤형 코칭을 구성하고 있습니다..."
            ]);
            errorBanner.classList.add('hidden');

            try {
                const feedback = await callGeminiApi(FEEDBACK_PROMPT(userAnalyses));
                lastFeedback = feedback;
                displayFeedbackReport(feedback);
                feedbackReportSection.classList.remove('hidden');
                window.scrollTo(0, 0);
            } catch (error) {
                console.error('Error getting feedback:', error);
                showError(`피드백을 받는 중 오류가 발생했습니다: ${error.message}`);
                analysisSection.classList.remove('hidden');
            } finally {
                nextChunkButton.disabled = false;
                hideDynamicLoader();
            }
        }

        // --- [v2.1] Display Feedback Report (v3.0 버튼 표시 로직 추가) ---
        // --- [v4.2 수정] 아코디언 UI (details, summary) 및 모달 제거, 원본 텍스트 즉시 표시 ---
        // --- [v4.6 수정] 요청 2: 아코디언 헤더 텍스트 토글 기능 적용 ---
         function displayFeedbackReport(feedback) {
            if (typeof feedback !== 'object' || feedback === null || !feedback.detailed_review) {
                console.error("Invalid feedback format:", feedback);
                showError('AI로부터 유효한 JSON 피드백을 받지 못했습니다. (detailed_review 누락)');
                analysisSection.classList.remove('hidden');
                return;
            }

            const {
                score = 0,
                summary_good_points = [],
                summary_improvement_points = [],
                detailed_review = []
             } = feedback;

            let scoreClass = 'score-c';
            if (score >= 85) scoreClass = 'score-s';
            else if (score >= 60) scoreClass = 'score-a';
            else if (score >= 40) scoreClass = 'score-b';

            let summary = '괜찮습니다. 모든 마스터도 이 단계에서 시작했습니다. 1:1 코칭을 성장의 발판으로 삼으세요.';
            if (score >= 85) summary = '압도적인 분석입니다! S-Class의 본질을 꿰뚫고 있습니다.';
            else if (score >= 60) summary = '좋은 시도입니다. 핵심을 상당히 파악하셨군요. 나머지를 함께 다듬어볼까요?';
            else if (score >= 40) summary = '성장의 가능성이 보입니다. 1:1 코칭을 통해 핵심을 찾아보세요.';

            feedbackScoreEl.textContent = `${score}점`;
            feedbackScoreEl.className = scoreClass;
            feedbackSummaryEl.textContent = safeHtml(summary);

             detailedReviewContainer.innerHTML = '';
             detailed_review.forEach((review, index) => {
                 const analysisHtml = review.user_analysis
                    ? `<p>${safeHtml(review.user_analysis)}</p>`
                    : `<p class="empty-analysis">분석을 입력하지 않았습니다.</p>`;
                 
                 const rawFeedback = review.specific_feedback;
                 const formattedFeedback = formatFeedbackText(rawFeedback);
                 
                 // [v4.6] 요청 2: 헤더 텍스트 (축약/전체) 준비
                 const originalChunkText = review.original_chunk;
                 // [v4.9] B안: '안전하게' HTML 이스케이프 처리된 텍스트를 data 속성에 저장
                 const fullHeaderText = safeHtml(`📄 훈련 #${index + 1}: ${originalChunkText}`);
                 const truncatedHeaderText = safeHtml(`📄 훈련 #${index + 1}: ${truncateText(originalChunkText, 50)}`);


                 // [v4.2] <details>와 <summary> 구조
                 // [v4.6] <h4>에 data 속성 추가, 기본 텍스트는 축약본
                 // [v4.9] B안: data 속성 값에 따옴표 추가 (HTML 속성값 표준)
                 const cardHtml = `
                    <details class="review-card">
                        <summary class="review-card-header">
                            <h4 data-full-text="${fullHeaderText}" data-truncated-text="${truncatedHeaderText}">
                                ${truncatedHeaderText} </h4>
                        </summary>
                        <div class="review-card-body">
                            <div class="user-analysis-box">
                                <h5>나의 훈련 내용</h5>
                                ${analysisHtml}
                            </div>
                            <div class="coach-feedback-box">
                                <h5>S-Class 코칭</h5>
                                <p>${formattedFeedback}</p>
                            </div>
                        </div>
                    </details>
                 `;
                 detailedReviewContainer.innerHTML += cardHtml;
             });

            // [v4.6] 요청 2: 아코디언 토글 이벤트 리스너 추가
            addAccordionToggleListeners();

            // [추가] 첫 번째 아코디언 항목은 기본으로 열어둠
            const firstDetail = detailedReviewContainer.querySelector('.review-card');
            if(firstDetail) {
                firstDetail.open = true;
                // [v4.6] 첫 번째 항목이 기본으로 '열려' 있으므로, 헤더 텍스트를 '전체'로 강제 업데이트
                const firstH4 = firstDetail.querySelector('.review-card-header h4');
                if (firstH4) {
                    firstH4.innerHTML = firstH4.dataset.fullText;
                }
            }


            goodPointsList.innerHTML = summary_good_points.length > 0
                ? summary_good_points.map(p => `<li>${safeHtml(p)}</li>`).join('')
                : '<li>요약된 강점이 없습니다.</li>';
                
            improvementPointsList.innerHTML = summary_improvement_points.length > 0
                ? summary_improvement_points.map(p => `<li>${safeHtml(p)}</li>`).join('')
                : '<li>요약된 보완점이 없습니다.</li>';

             // [v4.1] html 구조 변경으로, 이제 '다음 행동' 카드 내부의 버튼이 항상 표시됨
             generatePromptButton.classList.remove('hidden');
        }

        // [v4.6] 요청 2: 아코디언 토글 시 헤더 텍스트 변경
        function addAccordionToggleListeners() {
            const accordions = detailedReviewContainer.querySelectorAll('.review-card');
            
            accordions.forEach(accordion => {
                // 'toggle' 이벤트는 <details> 요소의 열림/닫힘 상태가 변경될 때 발생
                accordion.addEventListener('toggle', (event) => {
                    const h4 = event.target.querySelector('.review-card-header h4');
                    if (!h4) return; // 방어 코드

                    if (event.target.open) {
                        // 1. 아코디언이 열렸을 때
                        h4.innerHTML = h4.dataset.fullText;
                    } else {
                        // 2. 아코디언이 닫혔을 때
                        h4.innerHTML = h4.dataset.truncatedText;
                    }
                });
            });
        }


        // --- [v3.0] S급 성장 프롬프트 생성 (신규 함수) ---
        function handleGeneratePrompt() {
            if (!lastFeedback || !originalText || !userAnalyses) {
                showError("데이터가 없습니다. 훈련을 먼저 완료해주세요.");
                return;
            }

            const promptText = GROWTH_PROMPT(
                originalText, // [v4.9] B안: '성장 프롬프트'에는 AI가 수정한 텍스트가 아닌, 사용자의 '날것' 원본 텍스트를 보냅니다.
                JSON.stringify(userAnalyses, null, 2),
                JSON.stringify(lastFeedback, null, 2)
            );

            const tempTextarea = document.createElement('textarea');
            tempTextarea.value = promptText;
            document.body.appendChild(tempTextarea);
            tempTextarea.select();
            
            try {
                document.execCommand('copy');
                showError("✅ S급 성장 프롬프트가 클립보드에 복사되었습니다. AI 챗봇에 붙여넣으세요!");
                errorBanner.style.backgroundColor = 'var(--success-color)';
                errorBanner.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.3)';
            } catch (err) {
                console.error('Failed to copy prompt:', err);
                showError("프롬프트 복사에 실패했습니다. 수동으로 복사해주세요.");
                errorBanner.style.backgroundColor = 'var(--danger-color)';
                errorBanner.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.3)';
            } finally {
                document.body.removeChild(tempTextarea);
                
                setTimeout(() => {
                    errorBanner.style.backgroundColor = 'var(--danger-color)';
                    errorBanner.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.3)';
                    if (errorMessage.textContent.includes("복사되었습니다")) {
                        errorBanner.classList.add('hidden');
                    }
                }, 3000);
            }
        }


        // --- [v4.0] Reset UI Function (단계별 UI 반영) ---
        // --- [v4.6] 요청 1: 프로그레스 바 리셋 ---
        // --- [v4.9] B안: formattedOriginalText 초기화 ---
         function resetUI() {
            // [v4.0] 1단계(입력) 섹션만 표시
            inputSection.classList.remove('hidden');
            courseSection.classList.add('hidden'); // [v4.0] NEW
            analysisSection.classList.add('hidden');
            feedbackReportSection.classList.add('hidden');
            errorBanner.classList.add('hidden');
            hideDynamicLoader();

            textInput.value = '';
            courseOptions.forEach(o => o.classList.remove('selected'));
            selectedCourse = null;
            
            originalChunks = [];
            userAnalyses = [];
            currentChunkIndex = 0;
            
            lastFeedback = null;
            originalText = "";
            formattedOriginalText = ""; // [v4.9] B안: 초기화
            
            // [v4.1] html 구조 변경으로, 'S급 성장' 버튼은 항상 hidden 상태로 리셋
            generatePromptButton.classList.add('hidden');
            
            analysisInputsContainer.innerHTML = '';
            detailedReviewContainer.innerHTML = '';
            
            // [v4.6] 요청 1: 프로그레스 바 리셋
            if (progressPercentage) progressPercentage.textContent = '0% 완료';
            if (progressCount) progressCount.textContent = '(0 / 0)';
            if (progressBarForeground) progressBarForeground.style.width = '0%';

            nextChunkButton.textContent = '다음 ➔';
            nextChunkButton.disabled = false;
            prevChunkButton.classList.add('hidden'); // [v4.1] '이전' 버튼 숨김 처리

            // [v4.0] 1단계, 2단계 버튼 상태 초기화
            updateButtonState();
            updateCharCounter();
            
            window.scrollTo(0, 0);
         }

        // --- API CALL LOGIC (v1.2와 동일, 이미 강력함) ---
        async function callGeminiApi(prompt) {
            console.log("Sending prompt to API:", prompt);

            if (GEMINI_API_KEY === "AIzaSyCVTLte-n_F-83vTq3P1Fc16NzGXdKaIYI") {
                if (GEMINI_API_KEY.includes("YOUR_") || GEMINI_API_KEY.length < 30) {
                     showError("API 키가 설정되지 않았습니다. 스크립트 상단의 'GEMINI_API_KEY' 변수를 수정해주세요.");
                     throw new Error("API Key not set.");
                }
            }

             let retries = 0;
             const maxRetries = 3;
             const baseDelay = 1000;

             while(retries < maxRetries) {
                 try {
                     const response = await fetch(GEMINI_API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: {
                                responseMimeType: "application/json",
                            },
                            safetySettings: [
                                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                                // [v4.5 수정] 'DANGSROUS' -> 'DANGEROUS' 오타 수정
                                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                            ]
                        })
                    });

                    if (!response.ok) {
                         if (response.status === 429 || response.status >= 500) {
                             retries++;
                             if (retries >= maxRetries) throw new Error(`API 호출이 ${maxRetries}번의 재시도 후에도 실패했습니다 (Status: ${response.status}).`);
                             const delay = baseDelay * Math.pow(2, retries);
                             console.warn(`API call failed with status ${response.status}. Retrying in ${delay}ms... (${retries}/${maxRetries})`);
                             await new Promise(resolve => setTimeout(resolve, delay));
                             continue;
                         } else {
                            const errorBody = await response.text();
                            console.error("API Error Body:", errorBody);
                            throw new Error(`API 호출 실패: ${response.status} ${response.statusText}`);
                         }
                    }

                    const data = await response.json();

                     if (!data.candidates || data.candidates.length === 0 ||!data.candidates[0].content ||!data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0) {
                        if (data.candidates && data.candidates.length > 0 && data.candidates[0].finishReason === 'SAFETY') {
                            throw new Error("AI가 안전상의 이유로 응답을 거부했습니다.");
                        }
                        if (data.promptFeedback && data.promptFeedback.blockReason) {
                             throw new Error(`API 요청이 차단되었습니다: ${data.promptFeedback.blockReason}`);
                        }
                         console.error("Invalid API Response Structure:", data);
                         throw new Error("AI로부터 유효한 응답 구조를 받지 못했습니다.");
                    }

                    let jsonString = data.candidates[0].content.parts[0].text;

                    try {
                        const jsonMatch = jsonString.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
                        if (jsonMatch && jsonMatch[0]) {
                            jsonString = jsonMatch[0];
                        }

                        const parsedResult = JSON.parse(jsonString);
                        
                         // [v4.9] B안: SPLIT_PROMPT에 대한 응답 검증 (객체, chunks, formatted_text 키 확인)
                         if (prompt.includes('The Scalpel') && (typeof parsedResult !== 'object' || parsedResult === null || !parsedResult.chunks || typeof parsedResult.formatted_text === 'undefined')) {
                             console.error("Split prompt did not return a valid object with 'chunks' and 'formatted_text':", parsedResult);
                             throw new Error("AI가 쪼개기 결과를 객체 형식(chunks, formatted_text 포함)으로 반환하지 않았습니다.");
                         }
                         
                         if (prompt.includes('S-Class Coach') && (typeof parsedResult !== 'object' || parsedResult === null || !parsedResult.detailed_review)) {
                             console.error("Feedback prompt did not return a valid object with 'detailed_review':", parsedResult);
                             throw new Error("AI가 피드백 결과를 객체 형식(detailed_review 포함)으로 반환하지 않았습니다.");
                         }
                        return parsedResult;
                    } catch (parseError) {
                        console.error("Failed to parse JSON response (cleaned):", jsonString, parseError);
                        console.error("Original AI response (pre-cleaning):", data.candidates[0].content.parts[0].text); 
                        throw new Error("AI가 유효한 JSON 형식을 반환하지 않았습니다.");
                    }

                } catch (error) {
                    console.error("API Error during fetch or processing:", error);
                     if (retries >= maxRetries) throw error;
                    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('API Key not set')) {
                        if (error.message.includes('API Key not set')) throw error;

                        retries++;
                        const delay = baseDelay * Math.pow(2, retries);
                        console.warn(`API/Network error. Retrying in ${delay}ms... (${retries}/${maxRetries})`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    } else {
                        throw error;
                    }
                }
             }
             throw new Error(`API 호출이 ${maxRetries}번의 재시도 후에도 실패했습니다.`);
        }

        // --- [v4.9] PDF 다운로드 기능 (B안 적용: 1페이지 텍스트 삽입) ---
        // --- [v4.11] PDF 한글 깨짐 수정 (fetch/btoa/VFS 등록 방식) ---
        async function handleDownloadPDF() {
            const { jsPDF } = window.jspdf;
            const reportSection = document.getElementById('feedback-report-section');
            
            const accordions = reportSection.querySelectorAll('#detailed-review-container .review-card');
            
            if (!formattedOriginalText) {
                showError("PDF 생성을 위한 원본 텍스트 데이터가 없습니다. 훈련을 다시 시작해주세요.");
                return;
            }
            
            showDynamicLoader([
                "리포트를 PDF로 생성 중입니다...",
                "한글 폰트 파일을 다운로드 중입니다..." // [v4.11] 로더 메시지
            ]);
            downloadPdfButton.disabled = true;
            downloadPdfButton.textContent = '생성 중...';
        
            const originalOpenStates = [];
            const originalHeaderTexts = []; 
            
            accordions.forEach((acc, index) => {
                originalOpenStates[index] = acc.open;
                
                const h4 = acc.querySelector('.review-card-header h4');
                if (h4) {
                    originalHeaderTexts[index] = h4.innerHTML; 
                    h4.innerHTML = h4.dataset.fullText; 
                }
                
                acc.open = true; 
            });
        
            try {
                await new Promise(resolve => setTimeout(resolve, 300));
                
                const canvases = [];
                
                const reportHeader = reportSection.querySelector('.main-card.report-header');
                const reportSummaryTitle = reportHeader.querySelector('.report-summary-title');
                const feedbackDetails = reportHeader.querySelector('.feedback-details');
                
                const goodPointsPanel = document.getElementById('good-points-panel');
                const improvementPointsPanel = document.getElementById('improvement-points-panel');

                const detailedReviewTitleCard = reportSection.querySelectorAll('.main-card')[1];
                const reviewContainer = document.getElementById('detailed-review-container');

                const originalReportSummaryTitleNextSibling = reportSummaryTitle.nextSibling;
                const originalFeedbackDetailsNextSibling = feedbackDetails.nextSibling;
                
                const originalGoodPointsParent = goodPointsPanel.parentNode; 
                const originalImprovementPointsNextSibling = improvementPointsPanel.nextSibling;

                // --- V4.5: 3개 영역 분할 캡처 시작 ---
                
                // 1. Score/Summary Section 캡처
                reportSummaryTitle.remove();
                feedbackDetails.remove();
                
                await new Promise(resolve => setTimeout(resolve, 50)); 

                canvases.push(await html2canvas(reportHeader, { 
                    scale: 2, 
                    useCORS: true,
                    windowWidth: reportHeader.scrollWidth,
                    windowHeight: reportHeader.scrollHeight
                }));


                // 2. 강점 (Good Points) 섹션 캡처
                improvementPointsPanel.remove(); 
                
                const tempGoodPointsWrapper = document.createElement('div');
                tempGoodPointsWrapper.className = 'main-card report-header-temp'; 
                tempGoodPointsWrapper.style.padding = '40px';
                tempGoodPointsWrapper.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
                tempGoodPointsWrapper.style.borderRadius = '20px';
                tempGoodPointsWrapper.style.marginBottom = '40px';
                
                const titleGood = reportSummaryTitle.cloneNode(true); 
                titleGood.textContent = '📈 훈련 결과 (요약) - 강점'; 
                titleGood.style.textAlign = 'left'; 
                titleGood.style.marginBottom = '32px';

                tempGoodPointsWrapper.appendChild(titleGood);
                tempGoodPointsWrapper.appendChild(goodPointsPanel); 

                reportHeader.parentNode.insertBefore(tempGoodPointsWrapper, reportHeader.nextSibling); 
                await new Promise(resolve => setTimeout(resolve, 50)); 
                
                canvases.push(await html2canvas(tempGoodPointsWrapper, {
                    scale: 2, 
                    useCORS: true,
                    windowWidth: tempGoodPointsWrapper.scrollWidth,
                    windowHeight: tempGoodPointsWrapper.scrollHeight
                }));
                
                tempGoodPointsWrapper.remove(); 
                originalGoodPointsParent.insertBefore(goodPointsPanel, originalImprovementPointsNextSibling); 


                // 3. 보완점 (Improvement Points) 섹션 캡처
                goodPointsPanel.remove(); 
                
                const tempImprovementPointsWrapper = document.createElement('div');
                tempImprovementPointsWrapper.className = 'main-card report-header-temp'; 
                tempImprovementPointsWrapper.style.padding = '40px';
                tempImprovementPointsWrapper.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
                tempImprovementPointsWrapper.style.borderRadius = '20px';
                tempImprovementPointsWrapper.style.marginBottom = '40px';

                const titleImprovement = reportSummaryTitle.cloneNode(true);
                titleImprovement.textContent = '📈 훈련 결과 (요약) - 보완점'; 
                titleImprovement.style.textAlign = 'left';
                titleImprovement.style.marginBottom = '32px';

                tempImprovementPointsWrapper.appendChild(titleImprovement);
                tempImprovementPointsWrapper.appendChild(improvementPointsPanel); 
                
                reportHeader.parentNode.insertBefore(tempImprovementPointsWrapper, reportHeader.nextSibling); 
                await new Promise(resolve => setTimeout(resolve, 50)); 

                canvases.push(await html2canvas(tempImprovementPointsWrapper, {
                    scale: 2, 
                    useCORS: true,
                    windowWidth: tempImprovementPointsWrapper.scrollWidth,
                    windowHeight: tempImprovementPointsWrapper.scrollHeight
                }));

                tempImprovementPointsWrapper.remove(); 
                
                originalGoodPointsParent.appendChild(goodPointsPanel);
                originalGoodPointsParent.appendChild(improvementPointsPanel);
                
                reportHeader.insertBefore(reportSummaryTitle, originalReportSummaryTitleNextSibling);
                reportHeader.insertBefore(feedbackDetails, originalFeedbackDetailsNextSibling);
                await new Promise(resolve => setTimeout(resolve, 50)); 
                
                // --- V4.5: 3개 영역 분할 캡처 종료 ---
                
                // 4. 상세 코칭 제목 카드 캡처 
                reviewContainer.style.display = 'none'; 
                await new Promise(resolve => setTimeout(resolve, 50)); 
                
                canvases.push(await html2canvas(detailedReviewTitleCard, { 
                    scale: 2, 
                    useCORS: true,
                    windowWidth: detailedReviewTitleCard.scrollWidth,
                    windowHeight: detailedReviewTitleCard.scrollHeight
                }));
                
                reviewContainer.style.display = 'block'; 
                await new Promise(resolve => setTimeout(resolve, 50)); 

                // 5. 개별 리뷰 항목들 (.review-card) 캡처
                for (const card of accordions) {
                    const canvas = await html2canvas(card, {
                        scale: 2, 
                        useCORS: true,
                        windowWidth: card.scrollWidth,
                        windowHeight: card.scrollHeight
                    });
                    canvases.push(canvas);
                }

                // --- [v4.11] PDF 생성 및 폰트 등록 (확실한 방법) ---
                const pdf = new jsPDF({
                    orientation: 'p',
                    unit: 'px',
                });
        
                // [v4.11] 1. 폰트 파일을 직접 fetch (네트워크 요청)
                // (참고: https://cdn.jsdelivr.net/font-nanum/1.0/nanumgothic/v3/NanumGothic-Regular.ttf)
                const fontUrl = 'https://cdn.jsdelivr.net/font-nanum/1.0/nanumgothic/v3/NanumGothic-Regular.ttf';
                const fontResponse = await fetch(fontUrl);
                if (!fontResponse.ok) {
                    throw new Error(`한글 폰트 파일(${fontUrl})을 다운로드하는데 실패했습니다.`);
                }
                const fontData = await fontResponse.arrayBuffer(); // ArrayBuffer로 받기

                // [v4.11] 2. ArrayBuffer를 Base64 문자열로 변환 (jsPDF VFS 등록용)
                let binary = '';
                const bytes = new Uint8Array(fontData);
                const len = bytes.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const fontBase64 = btoa(binary);

                // [v4.11] 3. jsPDF의 가상 파일 시스템(VFS)에 폰트 등록
                const fontFileName = 'NanumGothic-Regular.ttf';
                const fontName = 'NanumGothic'; // PDF 내부에서 사용할 폰트 이름
                pdf.addFileToVFS(fontFileName, fontBase64);
                pdf.addFont(fontFileName, fontName, 'normal');
                
                // [v4.11] 4. 등록된 폰트를 기본 폰트로 설정
                pdf.setFont(fontName, 'normal');
                // --- [v4.11] 폰트 등록 완료 ---


                let pdfWidth = pdf.internal.pageSize.getWidth();
                const imagePageMargin = 20; 
                const textPageMargin = 40;  

                // --- [v4.9] B안: 1페이지에 AI가 문단 나눈 원본 텍스트 삽입 ---
                const usableTextWidth = pdfWidth - (textPageMargin * 2);

                // [v4.10] 폰트 지정 (v4.11에서 이미 위에서 setFont를 수행함)
                // pdf.setFont('NanumGothic', 'normal'); // ⬅️ v4.11: 이미 위에서 설정됨
                
                pdf.setFontSize(10); 
                
                pdf.text(formattedOriginalText, textPageMargin, textPageMargin, { 
                    maxWidth: usableTextWidth 
                });
                // --- [v4.9] 1페이지 완료 ---


                // --- [v4.9] B안: 2페이지부터 캡처본(Canvas) 삽입 ---
                canvases.forEach((canvas, index) => {
                    const imgData = canvas.toDataURL('image/png');
                    const imgWidth = canvas.width;
                    const imgHeight = canvas.height;
                    const ratio = imgHeight / imgWidth;
                    
                    const pdfImgWidth = pdfWidth - (imagePageMargin * 2);
                    const pdfImgHeight = pdfImgWidth * ratio;
        
                    pdf.addPage();
        
                    pdf.addImage(imgData, 'PNG', imagePageMargin, imagePageMargin, pdfImgWidth, pdfImgHeight);
                });
                // --- [v4.9] B안: PDF 생성 완료 ---
        
                pdf.save(`Jjokegi_Master_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        
            } catch (error) {
                console.error('Error generating PDF:', error);
                showError('PDF 생성 중 오류가 발생했습니다: ' + error.message);
                
                const reviewContainer = document.getElementById('detailed-review-container');
                if(reviewContainer.style.display === 'none') {
                    reviewContainer.style.display = 'block';
                }
                
                const reportHeader = reportSection.querySelector('.main-card.report-header');

                if(!reportHeader.contains(reportSummaryTitle) && reportSummaryTitle) reportHeader.appendChild(reportSummaryTitle);
                if(!reportHeader.contains(feedbackDetails) && feedbackDetails) reportHeader.appendChild(feedbackDetails);
                
                if(feedbackDetails.contains(goodPointsPanel) && !feedbackDetails.contains(improvementPointsPanel) && improvementPointsPanel) {
                     feedbackDetails.appendChild(improvementPointsPanel); 
                }
                if(!feedbackDetails.contains(goodPointsPanel) && goodPointsPanel) {
                    const tempFeedbackDetails = document.createElement('div');
                    tempFeedbackDetails.appendChild(goodPointsPanel);
                    tempFeedbackDetails.appendChild(improvementPointsPanel);
                    feedbackDetails.innerHTML = tempFeedbackDetails.innerHTML;
                }
                
                document.querySelectorAll('.report-header-temp').forEach(el => el.remove());

            } finally {
                // --- 캡처 후 아코디언 상태 원래대로 복원 ---
                accordions.forEach((acc, index) => {
                    acc.open = originalOpenStates[index];
                    
                    const h4 = acc.querySelector('.review-card-header h4');
                    if (h4) {
                        h4.innerHTML = originalHeaderTexts[index];
                    }
                });

                const reviewContainer = document.getElementById('detailed-review-container');
                if(reviewContainer.style.display === 'none') {
                    reviewContainer.style.display = 'block';
                }
        
                hideDynamicLoader();
                downloadPdfButton.disabled = false;
                downloadPdfButton.textContent = '📈 리포트 PDF로 저장';
            }
        }
        // --- [끝] 수정된 PDF 기능 ---


        // [v2.2] 피드백 텍스트 가독성 개선 헬퍼
        function formatFeedbackText(text) {
            if (!text) return '';
            // 1. 텍스트를 먼저 안전하게 이스케이프 처리합니다.
            let safeText = safeHtml(text);
            
            // 2. [v4.0] 피드백 반영: `**` 마크다운을 <strong>으로 변환
            // (참고: 이 기능은 원래 피드백에서 오해였지만, AI가 가끔 `**`를 쓸 수 있으므로 추가하면 좋음)
            // safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            
            // [v4.0] 피드백 반영: [대괄호] 키워드를 찾아 HTML 태그로 교체 (기존 로직 유지)
            //    정규식: 대괄호([)로 시작하고, 대괄호(])가 아닌 모든 문자(+)가 뒤따르고, 대괄호(])로 끝나는 패턴
            safeText = safeText.replace(/\[([^\]]+)\]/g, '<br><strong>[$1]</strong>');
            
            // 3. 만약 텍스트가 <br>로 시작한다면 제거합니다.
            if (safeText.startsWith('<br>')) {
                safeText = safeText.substring(4);
            }
            return safeText;
        }


        // --- [v4.1 요청 2] 모달 제어 로직 전체 삭제 ---


        // [v4.6] 요청 2: 텍스트 축약 헬퍼
        function truncateText(text, maxLength = 50) {
            if (typeof text !== 'string') return '';
            if (text.length <= maxLength) {
                return text;
            }
            // '...'를 포함하여 maxLength를 넘지 않도록 (예: 50자면 47자 + '...')
            // 사용자 요청은 50자로 축약하고 '...' -> 50자 + '...'로 이해함.
            return text.substring(0, maxLength) + '...';
        }


        // Helper function for safe HTML display
        function safeHtml(text) {
          // [v4.4 수정] 피드백 #2 반영: AI가 출력하는 마크다운(**) 제거
          if (typeof text !== 'string') return '';
        
          // 1. 별표(Bold) 마크다운을 먼저 제거합니다.
          let cleanedText = text.replace(/\*\*/g, '');
    
          // 2. HTML 이스케이프 처리를 합니다.
          return cleanedText.replace(/&/g, "&amp;")
                            .replace(/</g, "&lt;")
                            .replace(/>/g, "&gt;")
                            .replace(/"/g, "&quot;")
                            .replace(/'/g, "&#039;");
        }

        // 초기 로드
        updateCharCounter();
        updateButtonState(); // [v4.0] 1단계, 2단계 버튼 상태 모두 초기화