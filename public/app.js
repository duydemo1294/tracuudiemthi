// Application logic for THPT Exam Score Lookup

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const sbdInput = document.getElementById('sbd-input');
    const charCounter = document.getElementById('char-counter');
    const btnClear = document.getElementById('btn-clear');
    const btnSubmit = document.getElementById('btn-submit');
    const searchForm = document.getElementById('search-form');
    const testSbdBtn = document.getElementById('test-sbd-btn');
    
    const statusContainer = document.getElementById('status-container');
    const errorCard = document.getElementById('error-card');
    const errorMessage = document.getElementById('error-message');
    const loadingCard = document.getElementById('loading-card');
    
    const resultContainer = document.getElementById('result-container');
    const displaySbd = document.getElementById('display-sbd');
    const statGpa = document.getElementById('stat-gpa');
    const statRange = document.getElementById('stat-range');
    const statRangeSub = document.getElementById('stat-range-sub');
    const subjectCount = document.getElementById('subject-count');
    const scoresTableBody = document.getElementById('scores-table-body');
    const combinationsContainer = document.getElementById('combinations-container');
    const careerRecommendationsContainer = document.getElementById('career-recommendations-container');

    // Mappings and Configurations
    const SUBJECT_MAP = {
        'TOAN': 'Toán Học',
        'VA': 'Ngữ Văn',
        'LI': 'Vật Lý',
        'HO': 'Hóa Học',
        'SI': 'Sinh Học',
        'TI': 'Tin Học',
        'CNCN': 'Công Nghệ (CN)',
        'CNNN': 'Công Nghệ (NN)',
        'SU': 'Lịch Sử',
        'DI': 'Địa Lý',
        'KTPL': 'GD Kinh Tế & Pháp Luật',
        'NN': 'Ngoại Ngữ'
    };

    const LANG_MAP = {
        'N1': 'Tiếng Anh',
        'N2': 'Tiếng Nga',
        'N3': 'Tiếng Pháp',
        'N4': 'Tiếng Trung',
        'N5': 'Tiếng Đức',
        'N6': 'Tiếng Nhật'
    };

    // 1. SBD Input Restrictions & Character Counter
    sbdInput.addEventListener('input', (e) => {
        // Allow only digits
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 8) {
            value = value.slice(0, 8);
        }
        e.target.value = value;
        charCounter.textContent = `${value.length}/8`;
        
        // Dynamic counter colors
        if (value.length === 8) {
            charCounter.style.color = '#10b981'; // Green when complete
        } else {
            charCounter.style.color = 'var(--text-light)';
        }
    });

    // 2. Clear Button Handler
    btnClear.addEventListener('click', () => {
        sbdInput.value = '';
        charCounter.textContent = '0/8';
        charCounter.style.color = 'var(--text-light)';
        sbdInput.focus();
    });

    // 3. Quick Test Suggestion SBD Click
    testSbdBtn.addEventListener('click', () => {
        sbdInput.value = '01012345';
        charCounter.textContent = '8/8';
        charCounter.style.color = '#10b981';
        
        // Automatically submit the form
        executeLookup('01012345');
    });

    // 4. Form Submit Handler
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const sbd = sbdInput.value.trim();
        if (sbd.length !== 8) {
            showError('Số báo danh không hợp lệ. Vui lòng nhập đủ 8 chữ số.');
            return;
        }
        executeLookup(sbd);
    });

    // Main Lookup Execution
    async function executeLookup(sbd) {
        // UI reset states
        hideResults();
        showLoading();

        try {
            let response;
            let isStaticMode = false;
            
            try {
                // Try Node.js endpoint
                response = await fetch(`/api/tra-diem?sbd=${sbd}`);
                if (response.status === 404) {
                    isStaticMode = true;
                }
            } catch (err) {
                isStaticMode = true;
            }

            // If server-side endpoints failed or returned 404 (pure static hosting like GitHub Pages, Netlify)
            if (isStaticMode || !response || response.status === 404) {
                try {
                    // Query direct (works with browser CORS extensions)
                    response = await fetch(`https://vietnamnet.vn/giao-duc/diem-thi/tra-cuu-diem-thi-tot-nghiep-thpt/2026/${sbd}.html`);
                    const htmlText = await response.text();
                    
                    const record = {
                        "SOBAODANH": sbd,
                        "TOAN": "", "VA": "", "LI": "", "HO": "", "SI": "", "SU": "", "DI": "", "KTPL": "", "TI": "", "CNCN": "", "CNNN": "", "NN": "", "MON_NN": ""
                    };
                    
                    let foundAny = false;
                    const regex = /<td>(.*?)<\/td>\s*<td>(.*?)<\/td>/gi;
                    let match;
                    
                    function decodeHtml(html) {
                        return html.replace(/&#x([0-9A-Fa-f]+);/ig, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
                    }
                    
                    while ((match = regex.exec(htmlText)) !== null) {
                        const subjectName = decodeHtml(match[1]).trim().toLowerCase();
                        const scoreVal = match[2].trim();
                        
                        let key = null;
                        if (subjectName.includes('toán')) key = 'TOAN';
                        else if (subjectName.includes('văn')) key = 'VA';
                        else if (subjectName.includes('lý')) key = 'LI';
                        else if (subjectName.includes('hóa')) key = 'HO';
                        else if (subjectName.includes('sinh')) key = 'SI';
                        else if (subjectName.includes('sử')) key = 'SU';
                        else if (subjectName.includes('địa')) key = 'DI';
                        else if (subjectName.includes('pháp luật') || subjectName.includes('gdcd') || subjectName.includes('giáo dục')) key = 'KTPL';
                        else if (subjectName.includes('ngoại ngữ')) key = 'NN';
                        
                        if (key) {
                            record[key] = scoreVal;
                            foundAny = true;
                            if (key === 'NN' && !record.MON_NN) record.MON_NN = 'N1';
                        }
                    }
                    
                    if (!foundAny) {
                        showError(`Không tìm thấy kết quả thi của Số báo danh: ${sbd}. Vui lòng kiểm tra lại.`);
                        return;
                    }
                    
                    // Directly jump to render since we parsed it
                    hideLoading();
                    renderScores(sbd, record);
                    return;

                } catch (corsErr) {
                    console.error('CORS Blocked direct fetch:', corsErr);
                    showError(
                        `<strong>Hệ thống đang chạy ở chế độ Tĩnh (Static HTML).</strong><br><br>` +
                        `Do máy chủ VietNamNet chặn kết nối trực tiếp từ trình duyệt (lỗi CORS), bạn cần làm một trong hai cách sau:<br>` +
                        `1. Cài tiện ích Chrome/Edge: <strong>Allow CORS: Access-Control-Allow-Origin</strong> và bật tiện ích lên để vượt rào cản.<br>` +
                        `2. Hoặc tải mã nguồn chạy trên máy tính qua lệnh <code>npm start</code>.`
                    );
                    return;
                }
            }

            if (!response || !response.ok) {
                throw new Error('Không thể kết nối đến máy chủ tra cứu.');
            }
            
            const results = await response.json();
            
            // Extract the result record from response (array format)
            const record = extractRecord(results);
            
            if (!record) {
                showError(`Không tìm thấy kết quả thi của Số báo danh: ${sbd}. Vui lòng kiểm tra lại.`);
                return;
            }

            // Successfully retrieved scores - render result board
            renderScores(sbd, record);
        } catch (error) {
            console.error(error);
            showError('Đã xảy ra lỗi hệ thống khi kết nối đến API tra cứu. Vui lòng thử lại sau.');
        }
    }

    // Extraction helper
    function extractRecord(response) {
        if (!response) return null;
        
        // Handle array of objects
        if (Array.isArray(response)) {
            return response.length > 0 ? response[0] : null;
        }
        // Handle single object
        if (response.found === true && response._source) {
            return response._source;
        }
        if (response.SOBAODANH || response.Sobaodanh) {
            return response;
        }
        return null;
    }

    // Calculate score color card class
    function getScoreClass(score) {
        if (score >= 8.0) return 'score-card-high';
        if (score < 5.0) return 'score-card-low';
        return 'score-card-mid';
    }

    // Render results view
    function renderScores(sbd, record) {
        hideLoading();
        
        // Set candidate titles
        displaySbd.textContent = `SBD: ${sbd}`;
        
        // Collect active scores
        const activeScores = [];
        scoresTableBody.innerHTML = ''; // Reset table body
        
        Object.keys(SUBJECT_MAP).forEach((key) => {
            const rawVal = record[key];
            if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
                const val = parseFloat(rawVal);
                if (!isNaN(val)) {
                    let subjectName = SUBJECT_MAP[key];
                    
                    // Specific handling for Foreign Language (Ngoại Ngữ)
                    if (key === 'NN' && record['MON_NN']) {
                        const langCode = String(record['MON_NN']).trim().toUpperCase();
                        const langName = LANG_MAP[langCode] || langCode;
                        subjectName = `${subjectName} (${langName})`;
                    }

                    activeScores.push({
                        key: key,
                        name: subjectName,
                        score: val
                    });
                }
            }
        });

        // 1. Render Subject Table Rows
        activeScores.forEach((item) => {
            const rowClass = getScoreClass(item.score);
            const tr = document.createElement('tr');
            tr.className = `score-row ${rowClass}`;
            tr.innerHTML = `
                <td class="subject-column">${item.name}</td>
                <td class="score-column text-center">
                    <span class="score-badge">${item.score.toFixed(2).replace(/\.00$/, '')}</span>
                </td>
            `;
            scoresTableBody.appendChild(tr);
        });

        subjectCount.textContent = `${activeScores.length} Môn Thi`;

        // 2. Calculations for Statistics Panel
        if (activeScores.length > 0) {
            const totalScore = activeScores.reduce((sum, item) => sum + item.score, 0);
            const gpa = totalScore / activeScores.length;
            statGpa.textContent = gpa.toFixed(2);
            
            // Range (Min & Max)
            const scoresOnly = activeScores.map(i => i.score);
            const maxScore = Math.max(...scoresOnly);
            const minScore = Math.min(...scoresOnly);
            const maxSubject = activeScores.find(i => i.score === maxScore).name.split(' ')[0];
            const minSubject = activeScores.find(i => i.score === minScore).name.split(' ')[0];
            
            statRange.textContent = `${maxScore.toFixed(2).replace(/\.00$/, '')} / ${minScore.toFixed(2).replace(/\.00$/, '')}`;
            statRangeSub.textContent = `Cao nhất: ${maxSubject} - Thấp nhất: ${minSubject}`;
        } else {
            statGpa.textContent = '---';
            statRange.textContent = '---';
        }

        // 3. Render University Block combinations
        renderCombinations(record);

        // 4. Render Career Recommendations
        renderCareers(record);

        // Display dashboard
        resultContainer.classList.remove('d-none');
    }

    // Render typical exam block combinations (Khối thi Đại học)
    function renderCombinations(record) {
        combinationsContainer.innerHTML = ''; // Clear previous

        const combConfigs = [
            { id: 'A00', name: 'Khối A00', subjects: ['TOAN', 'LI', 'HO'], label: 'Toán, Lý, Hóa' },
            { id: 'A01', name: 'Khối A01', subjects: ['TOAN', 'LI', 'NN'], label: 'Toán, Lý, Anh' },
            { id: 'B00', name: 'Khối B00', subjects: ['TOAN', 'HO', 'SI'], label: 'Toán, Hóa, Sinh' },
            { id: 'C00', name: 'Khối C00', subjects: ['VA', 'SU', 'DI'], label: 'Văn, Sử, Địa' },
            { id: 'D01', name: 'Khối D01', subjects: ['TOAN', 'VA', 'NN'], label: 'Toán, Văn, Anh' }
        ];

        let validCombinationsCount = 0;

        combConfigs.forEach((config) => {
            let isValid = true;
            let sum = 0;

            for (const subKey of config.subjects) {
                const valStr = record[subKey];
                if (valStr !== undefined && valStr !== null && String(valStr).trim() !== '') {
                    const score = parseFloat(valStr);
                    if (!isNaN(score)) {
                        sum += score;
                    } else {
                        isValid = false;
                        break;
                    }
                } else {
                    isValid = false;
                    break;
                }
            }

            if (isValid) {
                validCombinationsCount++;
                const isHigh = sum >= 24.0;
                
                const combCard = document.createElement('div');
                combCard.className = 'comb-item-card';
                combCard.innerHTML = `
                    <div class="comb-name">${config.name}</div>
                    <div class="comb-subjects">${config.label}</div>
                    <div class="comb-total ${isHigh ? 'qualified' : ''}">${sum.toFixed(2).replace(/\.00$/, '')}</div>
                `;
                combinationsContainer.appendChild(combCard);
            }
        });

        // Hide combination container if none are active
        const insightCard = document.querySelector('.analysis-insight-card');
        if (validCombinationsCount === 0) {
            insightCard.classList.add('d-none');
        } else {
            insightCard.classList.remove('d-none');
        }
    }

    // Render Career Recommendations based on points
    function renderCareers(record) {
        careerRecommendationsContainer.innerHTML = ''; // Clear previous

        const careers = [
            {
                name: 'Thiết kế đồ họa',
                category: 'Nghệ thuật & Sáng tạo',
                badgeClass: 'badge-art',
                calculate: (r) => {
                    const toan = parseFloat(r.TOAN) || 5;
                    const van = parseFloat(r.VA) || 5;
                    return toan * 0.4 + van * 0.6;
                },
                getReason: (r) => `Tương quan điểm Ngữ Văn (${r.VA || 0}) và Toán (${r.TOAN || 0}) tốt, phù hợp năng lực thiết kế mỹ thuật.`
            },
            {
                name: 'Công nghệ kỹ thuật cơ khí',
                category: 'Kỹ thuật',
                badgeClass: 'badge-tech',
                calculate: (r) => {
                    if (!r.TOAN) return 0;
                    const toan = parseFloat(r.TOAN);
                    const ly = r.LI ? parseFloat(r.LI) : toan * 0.8;
                    return (toan * 0.6 + ly * 0.4) * (r.LI ? 1.0 : 0.8);
                },
                getReason: (r) => `Nền tảng Toán (${r.TOAN || 0}) và Lý (${r.LI || 'Chưa thi'}) tốt, hỗ trợ tốt cho kỹ thuật cơ khí.`
            },
            {
                name: 'Tiếng Anh',
                category: 'Ngôn ngữ',
                badgeClass: 'badge-lang',
                calculate: (r) => {
                    if (!r.NN) return 0;
                    const nn = parseFloat(r.NN);
                    const isEnglish = r.MON_NN && String(r.MON_NN).trim().toUpperCase() === 'N1';
                    return nn * (isEnglish ? 1.0 : 0.85);
                },
                getReason: (r) => `Điểm ngoại ngữ (${r.NN || 0}) của bạn là lợi thế lớn để theo học Ngôn ngữ Anh chuyên sâu.`
            },
            {
                name: 'Tiếng Hàn Quốc',
                category: 'Ngôn ngữ',
                badgeClass: 'badge-lang',
                calculate: (r) => {
                    if (!r.NN) return 0;
                    return parseFloat(r.NN) * 0.95;
                },
                getReason: (r) => `Điểm ngoại ngữ (${r.NN || 0}) mở rộng cơ hội học và làm việc với tiếng Hàn Quốc.`
            },
            {
                name: 'Công nghệ kỹ thuật ô tô',
                category: 'Kỹ thuật',
                badgeClass: 'badge-tech',
                calculate: (r) => {
                    if (!r.TOAN) return 0;
                    const toan = parseFloat(r.TOAN);
                    const ly = r.LI ? parseFloat(r.LI) : toan * 0.8;
                    return (toan * 0.5 + ly * 0.5) * (r.LI ? 1.0 : 0.8);
                },
                getReason: (r) => `Đo điểm Toán (${r.TOAN || 0}) và Lý (${r.LI || 'Chưa thi'}) phù hợp định hướng kỹ thuật ô tô.`
            },
            {
                name: 'Công nghệ thông tin',
                category: 'Công nghệ thông tin',
                badgeClass: 'badge-it',
                calculate: (r) => {
                    let score = 0, count = 0;
                    ['TOAN', 'TI', 'CNCN', 'NN', 'LI', 'HO', 'SI'].forEach(s => { if(r[s]) { score+=parseFloat(r[s]); count++; } });
                    let extraBoost = 1.0;
                    if (r.TOAN && parseFloat(r.TOAN) >= 8) extraBoost += 0.05;
                    if (r.TI && parseFloat(r.TI) >= 8) extraBoost += 0.1;
                    return count > 0 ? (score/count) * extraBoost : 0;
                },
                getReason: (r) => `Tư duy Toán (${r.TOAN || 0}) và các môn Tự nhiên rất tốt! Chuyên ngành: <strong>Phát triển phần mềm, Lập trình Web, Lập trình Game, Ứng dụng phần mềm</strong>.`
            },
            {
                name: 'Digital Marketing',
                category: 'Kinh tế & Marketing',
                badgeClass: 'badge-biz',
                calculate: (r) => {
                    const van = parseFloat(r.VA) || 5;
                    const nn = r.NN ? parseFloat(r.NN) : van * 0.8;
                    const toan = r.TOAN ? parseFloat(r.TOAN) : van * 0.8;
                    return van * 0.4 + nn * 0.3 + toan * 0.3;
                },
                getReason: (r) => `Văn (${r.VA || 0}) nhạy bén kết hợp ngoại ngữ (${r.NN || 0}) giúp làm truyền thông số rất tốt.`
            },
            {
                name: 'Marketing & Sales',
                category: 'Kinh tế & Marketing',
                badgeClass: 'badge-biz',
                calculate: (r) => {
                    const van = parseFloat(r.VA) || 5;
                    const nn = r.NN ? parseFloat(r.NN) : van * 0.8;
                    const toan = r.TOAN ? parseFloat(r.TOAN) : van * 0.8;
                    return van * 0.3 + nn * 0.3 + toan * 0.4;
                },
                getReason: (r) => `Tư duy kinh tế Toán (${r.TOAN || 0}) và ngôn ngữ giúp phát triển mảng bán hàng & kinh doanh.`
            },
            {
                name: 'Công nghệ kỹ thuật điện, điện tử',
                category: 'Kỹ thuật',
                badgeClass: 'badge-tech',
                calculate: (r) => {
                    if (!r.TOAN) return 0;
                    const toan = parseFloat(r.TOAN);
                    const ly = r.LI ? parseFloat(r.LI) : toan * 0.8;
                    return (toan * 0.5 + ly * 0.5) * (r.LI ? 1.0 : 0.8);
                },
                getReason: (r) => `Điểm Toán (${r.TOAN || 0}) và Lý (${r.LI || 'Chưa thi'}) tốt, hỗ trợ nghiên cứu vi mạch điện tử.`
            },
            {
                name: 'Công nghệ kỹ thuật điều khiển & Tự động hoá',
                category: 'Kỹ thuật',
                badgeClass: 'badge-tech',
                calculate: (r) => {
                    if (!r.TOAN) return 0;
                    const toan = parseFloat(r.TOAN);
                    const ly = r.LI ? parseFloat(r.LI) : toan * 0.6;
                    return (toan * 0.6 + ly * 0.4) * (r.LI ? 1.0 : 0.8);
                },
                getReason: (r) => `Tự động hóa đòi hỏi tư duy Toán (${r.TOAN || 0}) mạch lạc và kiến thức vật lý lý thuyết.`
            },
            {
                name: 'Công nghệ Chip & Bán dẫn',
                category: 'Kỹ thuật',
                badgeClass: 'badge-tech',
                calculate: (r) => {
                    if (!r.TOAN) return 0;
                    const toan = parseFloat(r.TOAN);
                    const ly = r.LI ? parseFloat(r.LI) : toan * 0.7;
                    return (toan * 0.6 + ly * 0.4) * (r.LI ? 1.0 : 0.7);
                },
                getReason: (r) => `Lợi thế điểm Toán (${r.TOAN || 0}) cao, thích hợp nghiên cứu sản xuất Chip và bán dẫn.`
            },
            {
                name: 'Truyền thông & Tổ chức sự kiện',
                category: 'Truyền thông',
                badgeClass: 'badge-art',
                calculate: (r) => {
                    const van = parseFloat(r.VA) || 5;
                    const nn = r.NN ? parseFloat(r.NN) : van * 0.8;
                    return van * 0.6 + nn * 0.4;
                },
                getReason: (r) => `Môn Văn (${r.VA || 0}) tốt cùng kỹ năng ngoại ngữ phù hợp với công việc truyền thông sự kiện.`
            }
        ];

        // 1. Sắp xếp toàn bộ các ngành dựa trên điểm số gốc thực tế
        careers.sort((a, b) => b.calculate(record) - a.calculate(record));

        // 2. Phân tích bộ tổ hợp để kiểm tra điều kiện đẩy Công nghệ thông tin
        const scoreToan = parseFloat(record.TOAN) || 0;
        const scoreLy = parseFloat(record.LI) || 0;
        const scoreHoa = parseFloat(record.HO) || 0;
        const scoreAnh = parseFloat(record.NN) || 0;
        const scoreTin = parseFloat(record.TI) || 0;
        const scoreCNCN = parseFloat(record.CNCN) || 0;
        const scoreCNNN = parseFloat(record.CNNN) || 0;
        const scoreCongNghe = Math.max(scoreCNCN, scoreCNNN);

        // Điều kiện 1: Thí sinh có điểm cao (>= 7.5) ở một trong các môn định hướng kỹ thuật/công nghệ/tự nhiên
        const hasHighTechScores = (scoreToan >= 7.5 || scoreLy >= 7.5 || scoreHoa >= 7.5 || scoreAnh >= 7.5 || scoreTin >= 7.5 || scoreCongNghe >= 7.5);

        // Điều kiện 2: Thí sinh có tham gia chọn khối thi tự nhiên/kỹ thuật
        const isNaturalScienceGroup = (scoreLy > 0 || scoreHoa > 0 || scoreTin > 0 || scoreCongNghe > 0);

        // Tổng kết điều kiện hợp lệ để ưu tiên đẩy IT lên đầu
        const shouldPushITToTop = hasHighTechScores || isNaturalScienceGroup;

        let topCareers = [];
        const bestIT = careers.find(c => c.category === 'Công nghệ thông tin');

        if (bestIT && shouldPushITToTop) {
            // Thỏa mãn điều kiện: Đưa IT lên vị trí số 1 độc tôn
            topCareers.push(bestIT);
            const others = careers.filter(c => c !== bestIT).slice(0, 3);
            topCareers.push(...others);
        } else {
            // Không thỏa mãn điều kiện (Ví dụ thí sinh chuyên khối xã hội): Lấy Top 4 ngành cao nhất hoàn toàn tự nhiên
            topCareers = careers.slice(0, 4);
        }
        
        // 3. Tính toán phần trăm hiển thị và áp dụng cơ chế cộng điểm ảo linh hoạt
        let maxOtherScore = 0;
        const nonITCareersInTop = topCareers.filter(c => c.category !== 'Công nghệ thông tin');
        if (nonITCareersInTop.length > 0) {
            maxOtherScore = Math.max(...nonITCareersInTop.map(c => c.calculate(record)));
        }
        
        topCareers.forEach((item, index) => {
            let score = item.calculate(record);
            
            // Xử lý điểm ảo cho ngành CNTT dựa theo ngữ cảnh điều kiện
            if (item.category === 'Công nghệ thông tin') {
                if (shouldPushITToTop) {
                    // Nếu đứng top 1: Giữ khoảng cách an toàn an toàn so với ngành thứ hai (~1.5% đến 2%)
                    if (score <= maxOtherScore) {
                        score = maxOtherScore + 0.15;
                    }
                } else {
                    // Nếu không đứng top 1: Giữ nguyên xếp hạng tự nhiên, chỉ nhân nhẹ hệ số thưởng 5% khuyến khích ngầm
                    score = score * 1.05;
                }
            }
            
            // Định dạng phần trăm hiển thị trực quan (Tối đa 99%)
            const matchPercentage = Math.min(Math.round(score * 10), 99);
            const reason = item.getReason(record);
            
            const careerRow = document.createElement('div');
            careerRow.className = 'career-item';
            careerRow.innerHTML = `
                <div class="career-info-group">
                    <div class="career-title-row">
                        <span class="career-name">${item.name}</span>
                        <span class="career-badge-tag ${item.badgeClass}">${item.category}</span>
                    </div>
                    <p class="career-reason">${reason}</p>
                </div>
                <div class="career-match-score">
                    <span class="match-num">${matchPercentage}%</span>
                    <span class="match-lbl">Phù Hợp</span>
                </div>
            `;
            careerRecommendationsContainer.appendChild(careerRow);
        });
    }

    // UI Helpers
    function showLoading() {
        statusContainer.classList.remove('d-none');
        loadingCard.classList.remove('d-none');
        btnSubmit.disabled = true;
        btnSubmit.querySelector('span').textContent = 'Đang Tra...';
    }

    // Hide loading state
    function hideLoading() {
        loadingCard.classList.add('d-none');
        btnSubmit.disabled = false;
        btnSubmit.querySelector('span').textContent = 'Tra Cứu';
    }

    // Show errors state
    function showError(message) {
        hideLoading();
        hideResults();
        
        statusContainer.classList.remove('d-none');
        errorCard.classList.remove('d-none');
        errorMessage.innerHTML = message;
    }

    // Hide result view containers
    function hideResults() {
        resultContainer.classList.add('d-none');
        errorCard.classList.add('d-none');
        statusContainer.classList.add('d-none');
    }
});