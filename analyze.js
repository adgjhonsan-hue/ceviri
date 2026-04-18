const fs = require('fs');

const data = JSON.parse(fs.readFileSync('result.json', 'utf8'));
const messages = data.messages.filter(m => m.type === 'message');

const locationMap = {
    'ÖZAL': ['özal', 'turgut özal', 'ramazanoğlu', 'hayal kahvesi', 'güzelyalı', 'özal sb'],
    'MENDERES': ['menderes', 'adnan menderes', 'dilberler', 'sevgi adası'],
    'ZİYAPAŞA': ['ziyapaşa', 'ziyapasa', 'ziya paşa', 'mado ziyapaşa'],
    'GAZİPAŞA': ['gazipaşa', 'gazipasa', 'gazi paşa', 'atatürk caddesi'],
    'TÜRKMENBAŞI': ['türkmenbaşı', 'turkmenbasi', 'türkmen başı'],
    'MAVİ BULVAR': ['mavi bulvar', 'mavi blv'],
    'KENAN EVREN': ['kenan evren', 'şehitler bulvarı'],
    'KOZAN YOLU': ['kozan yolu', 'kozan', 'yavuzlar', 'kanal köprü'],
    'KARATAŞ YOLU': ['karataş yolu', 'karataş', 'havutlu', 'doğankent'],
    'BARAJ YOLU': ['baraj yolu', 'hastane yolu', 'duygu kafe'],
    'OTOBAN': ['otoban', 'otoyol', 'gişeler', 'otoban girişi', 'otoban çıkışı'],
    'E5 (D400)': ['e5', 'e-5', 'd400', 'd-400', 'şakirpaşa', 'bakımyurdu', 'öğretmenler bulvarı'],
    'SARIÇAM': ['sarıçam', 'saricam', 'buruk', 'balcalı', 'atam petrol'],
    'SEYHAN': ['seyhan', 'çarşı', 'reşatbey', 'valilik', 'meydan'],
    'YÜREĞİR': ['yüreğir', 'yuregir', 'optimum', 'yamaçlı'],
    'ÇUKUROVA': ['çukurova', 'cukurova', 'pınar', 'belediye evleri', 'huzurevleri'],
    '80. YIL': ['80. yıl', '80 yıl', 'real'],
    'İBO OSMAN': ['ibo osman', 'baraj lisesi']
};

const landmarkKeywords = {
    'ÖZAL': ['aksagaz', 'ramazanoğlu', 'hayal kahvesi', 'şube', 'starbucks', 'güzelyalı'],
    'MENDERES': ['dilberler', 'kapaklar', 'sevgi adası', 'giriş', 'çıkış'],
    'ZİYAPAŞA': ['mado', 'atatürk parkı', 'vaililik', 'meydan'],
    'GAZİPAŞA': ['atatürk caddesi', 'valilik', 'sabah şubesi'],
    'TÜRKMENBAŞI': ['otoban girişi', 'belediye evleri', 'mopaş', 'pınar mahallesi'],
    'MAVİ BULVAR': ['kanal', 'köprü', 'ptt'],
    'OTOBAN': ['gişeler', 'mersin yolu', 'ayrımı', 'petrol'],
    'KOZAN YOLU': ['kanal', 'köprü', 'yavuzlar', 'akıncılar'],
    'SARIÇAM': ['balcalı', 'buruk', 'yurtlar', 'atam petrol'],
    'KARATAŞ YOLU': ['havutlu', 'doğankent', 'yüreğir devlet'],
    'BARAJ YOLU': ['hastane', 'duygu kafe', 'gençlik köprüsü'],
    'E5 (D400)': ['şakirpaşa', 'kuruköprü', 'bakımyurdu', 'öğretmenler bulvarı']
};

const results = {
    locations: {},
    hourly: Array(24).fill(0).map(() => ({})),
    heatMap: Array(7).fill(0).map(() => Array(24).fill(0)), // Day (0-6) x Hour (0-23)
    totalMessages: messages.length,
    validReports: 0
};

messages.forEach(m => {
    let text = "";
    if (typeof m.text === 'string') text = m.text;
    else if (Array.isArray(m.text)) text = m.text.map(t => typeof t === 'string' ? t : (t.text || "")).join("");
    if (!text) return;
    const lowerText = text.toLowerCase();
    const date = new Date(m.date);
    const hour = date.getHours();
    const day = date.getDay();

    const isRadar = lowerText.includes('radar') || lowerText.includes(' flash') || lowerText.includes('hýz');
    const isAlcohol = lowerText.includes('alkol') || lowerText.includes('üfle');
    const isCheck = lowerText.includes('çevirme') || lowerText.includes('uygulama') || lowerText.includes('duba') || lowerText.includes('polis');
    
    const isPositive = (isRadar || isAlcohol || isCheck) && 
                       !lowerText.includes('temiz') && !lowerText.includes('yok') && !lowerText.includes('serbest');

    Object.entries(locationMap).forEach(([unifiedName, synonyms]) => {
        if (synonyms.some(syn => lowerText.includes(syn))) {
            if (!results.locations[unifiedName]) {
                results.locations[unifiedName] = { 
                    pos: 0, total: 0, radar: 0, alcohol: 0, check: 0, landmarkCounts: {} 
                };
            }
            results.locations[unifiedName].total++;
            
            if (!results.hourly[hour][unifiedName]) {
                results.hourly[hour][unifiedName] = { 
                    pos: 0, total: 0, radar: 0, alcohol: 0, check: 0 
                };
            }
            results.hourly[hour][unifiedName].total++;

            if (isPositive) {
                results.locations[unifiedName].pos++;
                results.hourly[hour][unifiedName].pos++;
                results.heatMap[day][hour]++;

                if (isRadar) { results.locations[unifiedName].radar++; results.hourly[hour][unifiedName].radar++; }
                if (isAlcohol) { results.locations[unifiedName].alcohol++; results.hourly[hour][unifiedName].alcohol++; }
                if (isCheck) { results.locations[unifiedName].check++; results.hourly[hour][unifiedName].check++; }
                
                if (landmarkKeywords[unifiedName]) {
                    landmarkKeywords[unifiedName].forEach(lm => {
                        if (lowerText.includes(lm)) {
                            results.locations[unifiedName].landmarkCounts[lm] = (results.locations[unifiedName].landmarkCounts[lm] || 0) + 1;
                        }
                    });
                }
            }
        }
    });

    if (isPositive) results.validReports++;
});

Object.keys(results.locations).forEach(loc => {
    const lms = results.locations[loc].landmarkCounts;
    const top = Object.entries(lms).sort((a,b) => b[1] - a[1])[0];
    results.locations[loc].topLandmark = top ? top[0] : null;
});

fs.writeFileSync('analysis_results.json', JSON.stringify(results, null, 2));
console.log('Advanced intelligence analysis successful.');
