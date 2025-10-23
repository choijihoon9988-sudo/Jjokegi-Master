// --- AI CONFIGURATION ---
        // !!! 중요 !!!: 테스트를 위해 실제 Google AI Studio에서 발급받은 API 키를 "..." 안에 붙여넣으세요.
        const GEMINI_API_KEY = "AIzaSyCVTLte-n_F-83vTq3P1Fc16NzGXdKaIYI"; // ⬅️ 여기에 실제 API 키를 입력하세요.
        const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        // 만약 키가 없다면, https://aistudio.google.com/app/apikey 에서 생성할 수 있습니다.
        
        // --- [v3.0] S-Class AI Prompts ---

        // --- 1. '해부학자' 프롬프트 (SPLIT_PROMPT v3.0) ---
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

            const outputInstruction = "Your output MUST be a JSON array of strings, with no other text, commentary, or explanation.";
            return `${coreInstruction}\n\n${modeInstruction}\n\n${outputInstruction}\n\nText to analyze:\n"""${text}"""\n\nOutput only the JSON array.`;
        };

        // --- 2. 'S급 코치' 프롬프트 (FEEDBACK_PROMPT v3.0) ---
        const FEEDBACK_PROMPT = (userAnalyses) => {
            return `
                You are an S-Class Senior Marketer at 'Isanghan Marketing', a 'Jjokegi Theory' master. Your task is to act as an S-Class Coach providing a detailed 1:1 code review for a junior marketer's training submission.
                Your feedback must be mercilessly sharp, logical, and strategic, but ultimately **constructive and motivational**, aimed at fostering rapid **growth**. Do not be polite or vague. Be direct and analytical, **focusing on growth opportunities**.
                **All output text (summaries, plans, feedback) MUST be in KORAN and contain NO markdown.**

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

                **Your output MUST be a single, raw JSON object in the following structure. Do not add any other text or markdown.**

                \`\`\`json
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
                \`\`\`

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
        const progressIndicator = document.getElementById('progress-indicator');
        const nextChunkButton = document.getElementById('next-chunk-button');
        
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

            originalText = text;

            startSplitButton.disabled = true;
            startSplitButton.textContent = 'AI가 쪼개는 중...';
            // [v4.0] 2단계(코스 선택) 섹션을 숨김
            courseSection.classList.add('hidden'); 
            showDynamicLoader([
                "AI가 텍스트를 분석 중입니다...",
                "최소 의미 단위로 쪼개고 있습니다...",
                "S-Class 훈련을 준비 중입니다..."
            ]);
            errorBanner.classList.add('hidden');

            try {
                // [v3.0] S급 '해부학자' 프롬프트 호출
                const chunks = await callGeminiApi(SPLIT_PROMPT(text, selectedCourse));
                originalChunks = chunks;
                userAnalyses = new Array(chunks.length).fill(null);
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
            
            progressIndicator.textContent = `${currentChunkIndex + 1} / ${originalChunks.length} 항목 훈련 중`;

            if (currentChunkIndex === originalChunks.length - 1) {
                nextChunkButton.textContent = '결과 리포트 보기';
            } else {
                nextChunkButton.textContent = '다음 ➔';
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
        // --- [수정] 아코디언 UI (details, summary) 및 모달 속성 (data-full-text) 적용 ---
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
                 
                 // [v4.1] 헤더 텍스트 생성 (원본 보기 힌트 추가)
                 const headerText = `📄 훈련 #${index + 1}: ${safeHtml(review.original_chunk.substring(0, 40))}... <span class="view-original-hint">(원본 보기)</span>`;

                 // [수정] <details>와 <summary>를 사용한 아코디언 구조로 변경
                 //         <summary>에 data-full-text와 review-header-clickable 클래스 추가
                 const cardHtml = `
                    <details class="review-card">
                        <summary class="review-card-header review-header-clickable" data-full-text="${safeHtml(review.original_chunk)}">
                            <h4>${headerText}</h4>
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

            // [추가] 첫 번째 아코디언 항목은 기본으로 열어둠
            const firstDetail = detailedReviewContainer.querySelector('.review-card');
            if(firstDetail) {
                firstDetail.open = true;
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


        // --- [v3.0] S급 성장 프롬프트 생성 (신규 함수) ---
        function handleGeneratePrompt() {
            if (!lastFeedback || !originalText || !userAnalyses) {
                showError("데이터가 없습니다. 훈련을 먼저 완료해주세요.");
                return;
            }

            const promptText = GROWTH_PROMPT(
                originalText,
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
            
            // [v4.1] html 구조 변경으로, 'S급 성장' 버튼은 항상 hidden 상태로 리셋
            generatePromptButton.classList.add('hidden');
            
            analysisInputsContainer.innerHTML = '';
            detailedReviewContainer.innerHTML = '';
            
            progressIndicator.textContent = '';
            nextChunkButton.textContent = '다음 ➔';
            nextChunkButton.disabled = false;

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

        // --- [수정된 v4.2] PDF 다운로드 기능 (아코디언 강제 열기 + 섹션별 페이지 분리 + '다음 단계' 카드 제외) ---
        async function handleDownloadPDF() {
            const { jsPDF } = window.jspdf;
            const reportSection = document.getElementById('feedback-report-section');
            
            // [개선 1] 캡처 전에 모든 상세 코칭 아코디언을 찾습니다.
            const accordions = reportSection.querySelectorAll('#detailed-review-container .review-card');
            
            showDynamicLoader(["리포트를 PDF로 생성 중입니다..."]);
            downloadPdfButton.disabled = true;
            downloadPdfButton.textContent = '생성 중...';
        
            // [개선 1] 아코디언의 원래 'open' 상태를 저장합니다.
            const originalOpenStates = [];
            accordions.forEach((acc, index) => {
                originalOpenStates[index] = acc.open;
            });
        
            try {
                // --- [개선 1] 캡처 전 모든 아코디언 강제 열기 ---
                accordions.forEach(acc => {
                    acc.open = true; // 모든 아코디언을 엽니다.
                });
                // ---------------------------------------------
                
                // [개선 3] '다음 단계' 카드를 제외한 모든 메인 카드를 선택합니다.
                const cardsToCapture = reportSection.querySelectorAll('.main-card:not(#next-step-card)');
                const canvases = [];
                
                // DOM이 업데이트(아코디언 열림)된 후 캡처를 위해 잠시 대기
                await new Promise(resolve => setTimeout(resolve, 100)); 
                
                for (const card of cardsToCapture) {
                     const canvas = await html2canvas(card, {
                        scale: 2, // 고해상도 캡처
                        useCORS: true,
                        // 개별 카드 기준으로 캡처 (스크롤 높이 기준)
                        windowWidth: card.scrollWidth,
                        windowHeight: card.scrollHeight
                    });
                    canvases.push(canvas);
                }
                
                const pdf = new jsPDF({
                    orientation: 'p',
                    unit: 'px',
                });
        
                let pdfWidth = pdf.internal.pageSize.getWidth();
                const pageMargin = 20; // 페이지 상하단 여백
                
                canvases.forEach((canvas, index) => {
                    const imgData = canvas.toDataURL('image/png');
                    const imgWidth = canvas.width;
                    const imgHeight = canvas.height;
                    const ratio = imgHeight / imgWidth;
                    
                    // [개선 2] PDF 내부 이미지 너비를 페이지 너비에서 좌우 여백을 뺀 값으로 설정
                    const pdfImgWidth = pdfWidth - (pageMargin * 2);
                    const pdfImgHeight = pdfImgWidth * ratio;
        
                    // --- [개선 2] 카드(섹션)별로 새 페이지 강제 분리 ---
                    if (index > 0) {
                        pdf.addPage();
                    }
                    // -----------------------------------------------
        
                    // 이미지를 페이지에 추가 (상단 여백 적용)
                    // jspdf의 addImage는 이미지가 페이지보다 길 경우 자동으로 분할합니다.
                    pdf.addImage(imgData, 'PNG', pageMargin, pageMargin, pdfImgWidth, pdfImgHeight);
                });
        
                pdf.save(`Jjokegi_Master_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        
            } catch (error) {
                console.error('Error generating PDF:', error);
                showError('PDF 생성 중 오류가 발생했습니다: ' + error.message);
            } finally {
                // --- [개선 1] 캡처 후 아코디언 상태 원래대로 복원 ---
                accordions.forEach((acc, index) => {
                    // 저장해둔 원래 상태로 되돌립니다.
                    acc.open = originalOpenStates[index];
                });
                // --------------------------------------------------
        
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


        // --- [추가] 모달 제어 로직 ---
        const modal = document.getElementById('chunk-modal');
        const modalText = document.getElementById('modal-chunk-text');
        const modalClose = document.getElementById('modal-close-button');

        // 모달 여는 함수
        function showChunkModal(fullText) {
            modalText.innerHTML = safeHtml(fullText).replace(/\n/g, '<br>'); // 줄바꿈 유지
            modal.classList.remove('hidden');
        }

        // 모달 닫는 함수
        function hideChunkModal() {
            modal.classList.add('hidden');
        }

        // 이벤트 리스너 (이벤트 위임 사용)
        // .review-header-clickable는 동적으로 생성되므로 document에 리스너를 붙임
        document.addEventListener('click', function(e) {
            // 헤더 클릭 시
            const header = e.target.closest('.review-header-clickable');
            if (header) {
                // <summary>의 기본 동작(아코디언 열기/닫기)이 실행된 *직후* 모달을 연다.
                // (만약 summary 내부의 h4나 span을 클릭했다면 즉시 실행)
                setTimeout(() => {
                    // 아코디언이 열리거나 닫히는 동작과 모달이 동시에 뜨는 것을 방지
                    // (사용자가 헤더의 텍스트 영역을 명확히 클릭했을 때만 모달이 뜨도록)
                    // [v4.1] 클릭 타겟으로 .view-original-hint(span) 추가
                    if (e.target.tagName === 'H4' || e.target.tagName === 'SUMMARY' || e.target.classList.contains('view-original-hint')) {
                         // data-full-text 속성에서 원본 텍스트를 가져옴
                        const fullText = header.dataset.fullText;
                        if (fullText) {
                            showChunkModal(fullText);
                        }
                    }
                }, 50); // 50ms 딜레이로 summary 기본 동작과 충돌 방지
            }

            // 모달 닫기 버튼 클릭 시
            if (e.target === modalClose) {
                hideChunkModal();
            }

            // 모달 바깥 영역(overlay) 클릭 시
            if (e.target === modal) {
                hideChunkModal();
            }
        });
        // --- [끝] 모달 제어 로직 ---


        // Helper function for safe HTML display
        function safeHtml(text) {
          if (typeof text !== 'string') return '';
          return text.replace(/&/g, "&amp;")
                     .replace(/</g, "&lt;")
                     .replace(/>/g, "&gt;")
                     .replace(/"/g, "&quot;")
                     .replace(/'/g, "&#039;");
        }

        // 초기 로드
        updateCharCounter();
        updateButtonState(); // [v4.0] 1단계, 2단계 버튼 상태 모두 초기화