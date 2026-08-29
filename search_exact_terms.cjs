const fs = require('fs');
const path = require('path');

const terms = [
  "منشور", "متابِع", "متابَع", "تعديل الملف الشخصي", "مشاركة", "مكالمة نشطة", "مكالمة", "كتم", "بحث", "مراسلة", "المعلومات", "إضافة أعضاء", "الوسائط المشتركة", "الأعضاء", "مالك", "عضو",
  "تعديل", "اسم المجموعة", "الوصف", "اكتب وصفاً مختصراً", "الرابط المخصص", "الإعدادات المتقدمة", "التفاعلات", "الصلاحيات", "إدارة الصلاحيات", "المشرفون", "المكتومون", "المحظورون", "الأعضاء", "الإحصائيات", "المظهر", "المكافح العنيف للإزعاج", "إخفاء الأعضاء", "حذف ومغادرة المجموعة"
];

const content = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = content.split('\n');

const results = {};
terms.forEach(term => {
  results[term] = [];
});

lines.forEach((line, index) => {
  terms.forEach(term => {
    if (line.includes(term)) {
      results[term].push({ lineNum: index + 1, text: line.trim() });
    }
  });
});

for (const [term, matches] of Object.entries(results)) {
  console.log(`\n=== Term: "${term}" (${matches.length} matches) ===`);
  matches.forEach(m => {
    console.log(`${m.lineNum}: ${m.text}`);
  });
}
