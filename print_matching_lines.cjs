const fs = require('fs');

const terms = [
  "مكالمة نشطة", "مكالمة", "كتم", "بحث", "مراسلة", "المعلومات", "إضافة أعضاء", "الوسائط المشتركة", "الأعضاء", "مالك", "عضو",
  "تعديل", "اسم المجموعة", "الوصف", "اكتب وصفاً مختصراً", "الرابط المخصص", "الإعدادات المتقدمة", "التفاعلات", "الصلاحيات", "إدارة الصلاحيات", "المشرفون", "المكتومون", "المحظورون", "الأعضاء", "الإحصائيات", "المظهر", "المكافح العنيف للإزعاج", "إخفاء الأعضاء", "حذف ومغادرة المجموعة"
];

const content = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = content.split('\n');

terms.forEach(term => {
  console.log(`\n=== Matches for "${term}" ===`);
  lines.forEach((line, index) => {
    if (line.includes(term) && !line.includes('t(') && !line.trim().startsWith('//') && !line.trim().startsWith('console.')) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  });
});
