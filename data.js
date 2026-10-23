(function (root) {
  'use strict';
  function seed(now) {
    const date = now || new Date();
    const encgs = ['Agadir', 'Settat', 'Tanger', 'Marrakech', 'Oujda', 'Kénitra', 'El Jadida', 'Fès', 'Casablanca', 'Dakhla', 'Béni Mellal', 'Meknès'];
    const chapters = ['Bilan et résultat', 'Comptabilité analytique', 'Probabilités', 'Régression', 'Stratégie marketing', 'Étude de marché'];
    const slots = [];
    for (let day = 1; day <= 10; day += 1) {
      for (const hour of [10, 14, 18]) {
        const local = new Date(date.getTime() + day * 86400000);
        const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(local);
        const part = type => parts.find(item => item.type === type).value;
        const target = `${part('year')}-${part('month')}-${part('day')}T${String(hour).padStart(2, '0')}:00:00`;
        let instant = new Date(`${target}Z`);
        for (let pass = 0; pass < 2; pass += 1) {
          const shown = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Africa/Casablanca', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(instant).replace(' ', 'T');
          instant = new Date(instant.getTime() + new Date(`${target}Z`).getTime() - new Date(`${shown}Z`).getTime());
        }
        slots.push(instant.toISOString());
      }
    }
    return {
      version: 1, encgs, chapters,
      student: { id: 'student-1', name: 'Salma Benali', encg: 'Casablanca', level: 'S4', track: 'Gestion', verified: true },
      tutors: [
        { id: 't1', name: 'Yassine Amrani', subject: 'Comptabilité', chapters: chapters.slice(0, 2), encg: 'Casablanca', level: 'S4', language: 'Français', mode: 'En ligne', rating: 4.9, bio: 'Des méthodes concrètes pour comprendre les chiffres.', approved: true, slots: slots.slice(), photo: 'assets/yassine.jpg' },
        { id: 't2', name: 'Lina El Fassi', subject: 'Statistiques', chapters: chapters.slice(2, 4), encg: 'Fès', level: 'S6', language: 'Français', mode: 'En ligne', rating: 4.8, bio: 'Comprendre le raisonnement, puis pratiquer ensemble.', approved: true, slots: slots.slice(), photo: 'assets/lina.jpg' },
        { id: 't3', name: 'Adam Idrissi', subject: 'Marketing', chapters: chapters.slice(4), encg: 'Tanger', level: 'S4', language: 'Arabe', mode: 'Présentiel', rating: 4.7, bio: 'Des cas pratiques pour relier cours et terrain.', approved: false, slots: slots.slice(), photo: 'assets/adam.jpg' }
      ],
      offers: [
        { id: 'quick', name: 'Quick Help', price: 50, minutes: 30, credits: 1, days: 7 },
        { id: 'catch', name: 'Catch-up', price: 150, minutes: 90, credits: 1, days: 7 },
        { id: 'exam', name: 'Exam Rescue', price: 399, minutes: 90, credits: 3, days: 7 },
        { id: 'stay', name: 'Stay ONTRACK', price: 349, minutes: 60, credits: 4, days: 30 }
      ],
      programs: [
        { id: 'p1', name: 'Master Atlas - Finance', country: 'Maroc', track: 'Finance', level: 'S6', minGrade: 12, language: 'Français', budget: 20000, active: true },
        { id: 'p2', name: 'Master Horizon - Marketing', country: 'France', track: 'Marketing', level: 'S10', minGrade: 14, language: 'Français', budget: 70000, active: true },
        { id: 'p3', name: 'Master Meridian - Management', country: 'Canada', track: 'Gestion', level: 'S10', minGrade: 13, language: 'Anglais', budget: 120000, active: true }
      ],
      bookings: [], packages: [], transactions: [], reviews: [], notifications: [], messages: []
    };
  }
  const api = { seed };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OntrackData = api;
}(typeof globalThis !== 'undefined' ? globalThis : this));