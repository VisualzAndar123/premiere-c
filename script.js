// Configuration Sanity
const sanityConfig = {
    projectId: 'ge6gluia', // À remplacer par votre projectId
    dataset: 'production', // Ou le dataset que vous utilisez
    useCdn: true
};

// Client Sanity
const sanityClient = sanityConfig.projectId !== 'ge6gluia' 
    ? sanity.createClient(sanityConfig)
    : null;

// État de l'application
const appState = {
    currentPage: 'accueil',
    currentDate: new Date(),
    cachedData: {
        devoirs: [],
        examens: [],
        evenements: [],
        actualites: [],
        professeurs: [],
        delegues: [],
        matieres: []
    },
    useCachedData: false
};

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadCachedData();
    fetchAllData();
});

// Initialisation de l'application
function initializeApp() {
    // Afficher la page d'accueil par défaut
    showPage('accueil');
    
    // Initialiser le calendrier
    initializeCalendar();
    
    // Vérifier la connexion
    checkConnection();
}

// Configuration des écouteurs d'événements
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const pageId = this.getAttribute('href').substring(1);
            showPage(pageId);
        });
    });
    
    // Menu mobile
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    mobileMenuBtn.addEventListener('click', function() {
        this.classList.toggle('active');
        navLinks.classList.toggle('active');
    });
    
    // Fermer le bandeau d'erreur
    document.querySelector('.close-error').addEventListener('click', function() {
        document.getElementById('errorBanner').style.display = 'none';
    });
    
    // Navigation du calendrier
    document.getElementById('prevMonth').addEventListener('click', function() {
        changeMonth(-1);
    });
    
    document.getElementById('nextMonth').addEventListener('click', function() {
        changeMonth(1);
    });
    
    // Changement de vue du calendrier
    document.getElementById('monthView').addEventListener('click', function() {
        switchCalendarView('month');
    });
    
    document.getElementById('weekView').addEventListener('click', function() {
        switchCalendarView('week');
    });
    
    // Fermeture des modales
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').classList.remove('active');
        });
    });
    
    // Fermer les modales en cliquant à l'extérieur
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
}

// Navigation entre les pages
function showPage(pageId) {
    // Mettre à jour la navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`a[href="#${pageId}"]`).classList.add('active');
    
    // Masquer toutes les pages
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Afficher la page sélectionnée
    document.getElementById(pageId).classList.add('active');
    
    // Fermer le menu mobile
    document.querySelector('.mobile-menu-btn').classList.remove('active');
    document.querySelector('.nav-links').classList.remove('active');
    
    // Mettre à jour l'état
    appState.currentPage = pageId;
    
    // Actions spécifiques à chaque page
    switch(pageId) {
        case 'calendrier':
            renderCalendar();
            break;
        case 'actualites':
            renderNews();
            break;
        case 'professeurs':
            renderTeachers();
            break;
        case 'delegues':
            renderDelegates();
            break;
    }
}

// Gestion des données Sanity
async function fetchAllData() {
    if (!sanityClient) {
        console.warn('Sanity client non configuré. Utilisation des données en cache.');
        appState.useCachedData = true;
        updateUIWithCachedData();
        return;
    }
    
    try {
        // Récupérer toutes les données en parallèle
        const [
            devoirs,
            examens,
            evenements,
            actualites,
            professeurs,
            delegues,
            matieres
        ] = await Promise.all([
            fetchDevoirs(),
            fetchExamens(),
            fetchEvenements(),
            fetchActualites(),
            fetchProfesseurs(),
            fetchDelegues(),
            fetchMatieres()
        ]);
        
        // Mettre à jour le cache
        appState.cachedData = {
            devoirs,
            examens,
            evenements,
            actualites,
            professeurs,
            delegues,
            matieres
        };
        
        // Sauvegarder dans le localStorage
        localStorage.setItem('premiereC_cache', JSON.stringify(appState.cachedData));
        localStorage.setItem('premiereC_cache_timestamp', new Date().toISOString());
        
        // Mettre à jour l'interface
        updateUIWithCachedData();
        
        // Masquer le bandeau d'erreur si nécessaire
        if (appState.useCachedData) {
            document.getElementById('errorBanner').style.display = 'none';
            appState.useCachedData = false;
        }
        
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        
        // Utiliser les données en cache
        appState.useCachedData = true;
        updateUIWithCachedData();
        
        // Afficher le bandeau d'erreur
        document.getElementById('errorBanner').style.display = 'block';
    }
}

// Charger les données depuis le cache
function loadCachedData() {
    const cachedData = localStorage.getItem('premiereC_cache');
    const timestamp = localStorage.getItem('premiereC_cache_timestamp');
    
    if (cachedData && timestamp) {
        // Vérifier si le cache est récent (moins de 24 heures)
        const cacheDate = new Date(timestamp);
        const now = new Date();
        const hoursDiff = (now - cacheDate) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
            appState.cachedData = JSON.parse(cachedData);
        }
    }
}

// Mettre à jour l'interface avec les données en cache
function updateUIWithCachedData() {
    renderHomePage();
    renderCalendar();
    renderNews();
    renderTeachers();
    renderDelegates();
}

// Vérifier la connexion
function checkConnection() {
    if (!navigator.onLine) {
        appState.useCachedData = true;
        document.getElementById('errorBanner').style.display = 'block';
    }
}

// REQUÊTES SANITY

// Récupérer les devoirs
async function fetchDevoirs() {
    if (!sanityClient) return [];
    
    const query = `*[_type == "devoir"]{
        _id,
        title,
        description,
        date,
        matiere->{name},
        teacher->{name}
    }`;
    
    return await sanityClient.fetch(query);
}

// Récupérer les examens
async function fetchExamens() {
    if (!sanityClient) return [];
    
    const query = `*[_type == "examen"]{
        _id,
        title,
        description,
        date,
        matiere->{name},
        teacher->{name}
    }`;
    
    return await sanityClient.fetch(query);
}

// Récupérer les événements
async function fetchEvenements() {
    if (!sanityClient) return [];
    
    const query = `*[_type == "evenement"]{
        _id,
        title,
        description,
        date,
        location
    }`;
    
    return await sanityClient.fetch(query);
}

// Récupérer les actualités
async function fetchActualites() {
    if (!sanityClient) return [];
    
    const query = `*[_type == "actualite"] | order(date desc){
        _id,
        title,
        content,
        date,
        image
    }`;
    
    return await sanityClient.fetch(query);
}

// Récupérer les professeurs
async function fetchProfesseurs() {
    if (!sanityClient) return getDefaultTeachers();
    
    const query = `*[_type == "professeur"]{
        _id,
        name,
        subjects[]->{name},
        phone,
        email,
        photo
    }`;
    
    const teachers = await sanityClient.fetch(query);
    return teachers.length > 0 ? teachers : getDefaultTeachers();
}

// Récupérer les délégués
async function fetchDelegues() {
    if (!sanityClient) return getDefaultDelegates();
    
    const query = `*[_type == "delegue"]{
        _id,
        name,
        role,
        description,
        contact,
        photo
    }`;
    
    const delegates = await sanityClient.fetch(query);
    return delegates.length > 0 ? delegates : getDefaultDelegates();
}

// Récupérer les matières
async function fetchMatieres() {
    if (!sanityClient) return [];
    
    const query = `*[_type == "matiere"]{
        _id,
        name
    }`;
    
    return await sanityClient.fetch(query);
}

// RENDU DES PAGES

// Page d'accueil
function renderHomePage() {
    renderRecentNews();
    renderUpcomingEvents();
}

// Actualités récentes
function renderRecentNews() {
    const container = document.getElementById('recentNews');
    const actualites = appState.cachedData.actualites.slice(0, 3);
    
    if (actualites.length === 0) {
        container.innerHTML = '<p>Aucune actualité récente.</p>';
        return;
    }
    
    container.innerHTML = actualites.map(news => `
        <div class="news-card fade-in">
            ${news.image ? `<img src="${news.image}" alt="${news.title}" class="news-image">` : ''}
            <div class="news-content">
                <div class="news-date">${formatDate(news.date)}</div>
                <h3>${news.title}</h3>
                <p>${news.content.substring(0, 100)}...</p>
            </div>
        </div>
    `).join('');
    
    // Activer les animations
    setTimeout(() => {
        document.querySelectorAll('.fade-in').forEach(el => {
            el.classList.add('visible');
        });
    }, 100);
}

// Événements à venir
function renderUpcomingEvents() {
    const container = document.getElementById('upcomingEvents');
    const now = new Date();
    
    // Combiner tous les événements
    const allEvents = [
        ...appState.cachedData.devoirs.map(d => ({...d, type: 'devoir'})),
        ...appState.cachedData.examens.map(e => ({...e, type: 'examen'})),
        ...appState.cachedData.evenements.map(e => ({...e, type: 'evenement'}))
    ];
    
    // Filtrer les événements à venir (dans les 30 prochains jours)
    const upcomingEvents = allEvents
        .filter(event => new Date(event.date) >= now)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5);
    
    if (upcomingEvents.length === 0) {
        container.innerHTML = '<p>Aucun événement à venir.</p>';
        return;
    }
    
    container.innerHTML = upcomingEvents.map(event => `
        <div class="event-item">
            <div>
                <div class="event-date">${formatDate(event.date)}</div>
                <div>${event.title}</div>
            </div>
            <div class="event-type event-${event.type}">
                ${event.type === 'devoir' ? 'Devoir' : event.type === 'examen' ? 'Examen' : 'Événement'}
            </div>
        </div>
    `).join('');
}

// CALENDRIER

// Initialisation du calendrier
function initializeCalendar() {
    const currentMonthElement = document.getElementById('currentMonth');
    const now = new Date();
    currentMonthElement.textContent = formatMonthYear(now);
}

// Changer de mois
function changeMonth(direction) {
    const currentDate = appState.currentDate;
    currentDate.setMonth(currentDate.getMonth() + direction);
    
    document.getElementById('currentMonth').textContent = formatMonthYear(currentDate);
    renderCalendar();
}

// Changer de vue calendrier
function switchCalendarView(view) {
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelectorAll('.calendar-view').forEach(viewEl => {
        viewEl.classList.remove('active');
    });
    
    if (view === 'month') {
        document.getElementById('monthView').classList.add('active');
        document.getElementById('monthlyView').classList.add('active');
    } else {
        document.getElementById('weekView').classList.add('active');
        document.getElementById('weeklyView').classList.add('active');
    }
    
    renderCalendar();
}

// Rendu du calendrier
function renderCalendar() {
    const currentView = document.querySelector('.calendar-view.active').id;
    
    if (currentView === 'monthlyView') {
        renderMonthlyCalendar();
    } else {
        renderWeeklyCalendar();
    }
}

// Rendu du calendrier mensuel
function renderMonthlyCalendar() {
    const container = document.getElementById('calendarGrid');
    const year = appState.currentDate.getFullYear();
    const month = appState.currentDate.getMonth();
    
    // Premier jour du mois
    const firstDay = new Date(year, month, 1);
    // Dernier jour du mois
    const lastDay = new Date(year, month + 1, 0);
    
    // Jour de la semaine du premier jour (0 = dimanche, 1 = lundi, etc.)
    let firstDayOfWeek = firstDay.getDay();
    // Ajuster pour commencer le lundi
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    // Combiner tous les événements
    const allEvents = [
        ...appState.cachedData.devoirs.map(d => ({...d, type: 'devoir', color: 'homework'})),
        ...appState.cachedData.examens.map(e => ({...e, type: 'examen', color: 'exam'})),
        ...appState.cachedData.evenements.map(e => ({...e, type: 'evenement', color: 'event'}))
    ];
    
    let calendarHTML = '';
    
    // Jours vides avant le premier jour du mois
    for (let i = 0; i < firstDayOfWeek; i++) {
        calendarHTML += '<div class="calendar-day empty"></div>';
    }
    
    // Jours du mois
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const currentDate = new Date(year, month, day);
        const dateString = formatDateForAPI(currentDate);
        
        // Événements de ce jour
        const dayEvents = allEvents.filter(event => 
            formatDateForAPI(new Date(event.date)) === dateString
        );
        
        // Créer les indicateurs d'événements
        const eventIndicators = dayEvents.map(event => 
            `<div class="event-indicator indicator-${event.color}"></div>`
        ).join('');
        
        calendarHTML += `
            <div class="calendar-day" data-date="${dateString}">
                <div class="calendar-day-number">${day}</div>
                <div class="event-indicators">${eventIndicators}</div>
            </div>
        `;
    }
    
    container.innerHTML = calendarHTML;
    
    // Ajouter les écouteurs d'événements pour les jours
    document.querySelectorAll('.calendar-day:not(.empty)').forEach(day => {
        day.addEventListener('click', function() {
            showEventDetails(this.getAttribute('data-date'));
        });
    });
}

// Rendu du calendrier hebdomadaire
function renderWeeklyCalendar() {
    const year = appState.currentDate.getFullYear();
    const month = appState.currentDate.getMonth();
    const date = appState.currentDate.getDate();
    
    // Premier jour de la semaine (lundi)
    const firstDayOfWeek = new Date(year, month, date);
    const dayOfWeek = firstDayOfWeek.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    firstDayOfWeek.setDate(date + diffToMonday);
    
    // Rendu de l'en-tête de la semaine
    const weekHeader = document.getElementById('weekHeader');
    let headerHTML = '';
    
    // Rendu de la grille de la semaine
    const weekGrid = document.getElementById('weekGrid');
    let gridHTML = '';
    
    // Combiner tous les événements
    const allEvents = [
        ...appState.cachedData.devoirs.map(d => ({...d, type: 'devoir', color: 'homework'})),
        ...appState.cachedData.examens.map(e => ({...e, type: 'examen', color: 'exam'})),
        ...appState.cachedData.evenements.map(e => ({...e, type: 'evenement', color: 'event'}))
    ];
    
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(firstDayOfWeek);
        currentDate.setDate(firstDayOfWeek.getDate() + i);
        const dateString = formatDateForAPI(currentDate);
        
        // En-tête
        headerHTML += `
            <div class="week-day-header">
                ${formatDayName(currentDate.getDay())}<br>
                ${currentDate.getDate()}
            </div>
        `;
        
        // Événements de ce jour
        const dayEvents = allEvents.filter(event => 
            formatDateForAPI(new Date(event.date)) === dateString
        );
        
        const eventsHTML = dayEvents.map(event => `
            <div class="week-event event-${event.color}">
                ${event.title}
            </div>
        `).join('');
        
        gridHTML += `
            <div class="week-day" data-date="${dateString}">
                ${eventsHTML}
            </div>
        `;
    }
    
    weekHeader.innerHTML = headerHTML;
    weekGrid.innerHTML = gridHTML;
    
    // Ajouter les écouteurs d'événements pour les jours
    document.querySelectorAll('.week-day').forEach(day => {
        day.addEventListener('click', function() {
            showEventDetails(this.getAttribute('data-date'));
        });
    });
}

// Afficher les détails des événements d'une date
function showEventDetails(dateString) {
    const date = new Date(dateString);
    const modal = document.getElementById('eventModal');
    const modalDate = document.getElementById('modalDate');
    const modalEvents = document.getElementById('modalEvents');
    
    modalDate.textContent = formatFullDate(date);
    
    // Combiner tous les événements
    const allEvents = [
        ...appState.cachedData.devoirs.map(d => ({...d, type: 'devoir', className: 'modal-event-homework'})),
        ...appState.cachedData.examens.map(e => ({...e, type: 'examen', className: 'modal-event-exam'})),
        ...appState.cachedData.evenements.map(e => ({...e, type: 'evenement', className: 'modal-event-event'}))
    ];
    
    // Filtrer les événements de cette date
    const dayEvents = allEvents.filter(event => 
        formatDateForAPI(new Date(event.date)) === dateString
    );
    
    if (dayEvents.length === 0) {
        modalEvents.innerHTML = '<p>Aucun événement prévu pour cette date.</p>';
    } else {
        modalEvents.innerHTML = dayEvents.map(event => `
            <div class="modal-event-item ${event.className}">
                <div class="modal-event-title">${event.title}</div>
                <div class="modal-event-details">
                    ${event.type === 'devoir' ? 'Devoir' : event.type === 'examen' ? 'Examen' : 'Événement'}
                    ${event.matiere ? ` - ${event.matiere.name}` : ''}
                    ${event.description ? `<br>${event.description}` : ''}
                </div>
            </div>
        `).join('');
    }
    
    modal.classList.add('active');
}

// ACTUALITÉS

// Rendu des actualités
function renderNews() {
    const container = document.getElementById('newsContainer');
    const actualites = appState.cachedData.actualites;
    
    if (actualites.length === 0) {
        container.innerHTML = '<p>Aucune actualité pour le moment.</p>';
        return;
    }
    
    container.innerHTML = actualites.map(news => `
        <div class="news-card fade-in">
            ${news.image ? `<img src="${news.image}" alt="${news.title}" class="news-image">` : ''}
            <div class="news-content">
                <div class="news-date">${formatDate(news.date)}</div>
                <h3>${news.title}</h3>
                <p>${news.content}</p>
            </div>
        </div>
    `).join('');
    
    // Activer les animations
    setTimeout(() => {
        document.querySelectorAll('.fade-in').forEach(el => {
            el.classList.add('visible');
        });
    }, 100);
}

// PROFESSEURS

// Rendu des professeurs
function renderTeachers() {
    const container = document.getElementById('teachersGrid');
    const professeurs = appState.cachedData.professeurs;
    
    container.innerHTML = professeurs.map(teacher => `
        <div class="teacher-card" data-teacher-id="${teacher._id || teacher.name}">
            <img src="${teacher.photo || 'placeholder-teacher.jpg'}" alt="${teacher.name}" class="teacher-photo">
            <div class="teacher-info">
                <div class="teacher-name">${teacher.name}</div>
                <div class="teacher-subject">${getTeacherSubjects(teacher)}</div>
                <a href="${getTeacherContactLink(teacher)}" class="teacher-contact" target="_blank">Contact</a>
            </div>
        </div>
    `).join('');
    
    // Ajouter les écouteurs d'événements
    document.querySelectorAll('.teacher-card').forEach(card => {
        card.addEventListener('click', function() {
            showTeacherDetails(this.getAttribute('data-teacher-id'));
        });
    });
}

// Afficher les détails d'un professeur
function showTeacherDetails(teacherId) {
    const teacher = appState.cachedData.professeurs.find(t => 
        (t._id || t.name) === teacherId
    );
    
    if (!teacher) return;
    
    const modal = document.getElementById('teacherModal');
    const container = document.getElementById('teacherDetails');
    
    // Récupérer les devoirs et examens de ce professeur
    const teacherSubjects = teacher.subjects ? teacher.subjects.map(s => s.name) : [];
    const upcomingHomeworks = appState.cachedData.devoirs
        .filter(d => teacherSubjects.includes(d.matiere?.name))
        .filter(d => new Date(d.date) >= new Date())
        .slice(0, 5);
    
    const upcomingExams = appState.cachedData.examens
        .filter(e => teacherSubjects.includes(e.matiere?.name))
        .filter(e => new Date(e.date) >= new Date())
        .slice(0, 5);
    
    container.innerHTML = `
        <div class="teacher-detail-header">
            <img src="${teacher.photo || 'placeholder-teacher.jpg'}" alt="${teacher.name}" class="teacher-detail-photo">
            <div class="teacher-detail-info">
                <h3>${teacher.name}</h3>
                <div class="teacher-detail-subject">${getTeacherSubjects(teacher)}</div>
                <a href="${getTeacherContactLink(teacher)}" class="teacher-contact" target="_blank">Contact WhatsApp</a>
            </div>
        </div>
        
        <div class="teacher-upcoming">
            <h4>Devoirs à venir</h4>
            <div class="upcoming-list">
                ${upcomingHomeworks.length > 0 ? 
                    upcomingHomeworks.map(hw => `
                        <div class="upcoming-item">
                            <div>${hw.title}</div>
                            <div>${formatDate(hw.date)}</div>
                        </div>
                    `).join('') : 
                    '<p>Aucun devoir à venir</p>'
                }
            </div>
        </div>
        
        <div class="teacher-upcoming">
            <h4>Examens à venir</h4>
            <div class="upcoming-list">
                ${upcomingExams.length > 0 ? 
                    upcomingExams.map(exam => `
                        <div class="upcoming-item">
                            <div>${exam.title}</div>
                            <div>${formatDate(exam.date)}</div>
                        </div>
                    `).join('') : 
                    '<p>Aucun examen à venir</p>'
                }
            </div>
        </div>
    `;
    
    modal.classList.add('active');
}

// DÉLÉGUÉS

// Rendu des délégués
function renderDelegates() {
    const container = document.getElementById('delegatesGrid');
    const delegues = appState.cachedData.delegues;
    
    container.innerHTML = delegues.map(delegate => `
        <div class="delegate-card">
            <img src="${delegate.photo || 'placeholder-delegate.jpg'}" alt="${delegate.name}" class="delegate-photo">
            <div class="delegate-info">
                <div class="delegate-name">${delegate.name}</div>
                <div class="delegate-role">${delegate.role}</div>
                <div class="delegate-description">${delegate.description}</div>
                <a href="${delegate.contact}" class="delegate-contact" target="_blank">Contact</a>
            </div>
        </div>
    `).join('');
}

// FONCTIONS UTILITAIRES

// Obtenir les matières d'un professeur
function getTeacherSubjects(teacher) {
    if (!teacher.subjects || teacher.subjects.length === 0) {
        return 'Matière non spécifiée';
    }
    
    return teacher.subjects.map(s => s.name).join(', ');
}

// Obtenir le lien de contact d'un professeur
function getTeacherContactLink(teacher) {
    if (teacher.phone) {
        return `https://wa.me/${teacher.phone.replace(/\s/g, '')}`;
    }
    
    if (teacher.email) {
        return `mailto:${teacher.email}`;
    }
    
    return '#';
}

// Formater une date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Formater une date complète
function formatFullDate(date) {
    return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Formater le mois et l'année
function formatMonthYear(date) {
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long'
    });
}

// Formater le nom du jour
function formatDayName(dayIndex) {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return days[dayIndex];
}

// Formater une date pour l'API (YYYY-MM-DD)
function formatDateForAPI(date) {
    return date.toISOString().split('T')[0];
}

// DONNÉES PAR DÉFAUT

// Professeurs par défaut
function getDefaultTeachers() {
    return [
        {
            _id: 'math',
            name: 'M. Islambuli',
            subjects: [{name: 'Mathématiques'}],
            phone: '+961123456789',
            email: 'islambuli@example.com',
            photo: 'placeholder-teacher.jpg'
        },
    ];
}

// Délégués par défaut
function getDefaultDelegates() {
    return [
        {
            _id: 'delegate1',
            name: 'Keagan Estephan',
            role: 'Délégué(e)',
            description: 'Représentant principal de la classe, responsable de la communication avec les professeurs et de la coordination des activités.',
            contact: 'https://wa.me/123456789',
            photo: 'placeholder-delegate.jpg'
        },
        {
            _id: 'delegate2',
            name: 'Julien Bassil',
            role: 'Sous-Délégué(e)',
            description: 'Assiste le délégué principal et le remplace en cas d\'absence. Responsable de la gestion des documents de classe.',
            contact: 'https://wa.me/123456790',
            photo: 'placeholder-delegate.jpg'
        },
        {
            _id: 'Andrew Zein',
            name: 'Lucas Bernard',
            role: 'Éco-Délégué(e)',
            description: 'Responsable des initiatives écologiques de la classe et de la sensibilisation aux enjeux environnementaux.',
            contact: 'https://wa.me/123456791',
            photo: 'placeholder-delegate.jpg'
        }
    ];
}

// Gestion de la déconnexion/réconnection
window.addEventListener('online', function() {
    fetchAllData();
});

window.addEventListener('offline', function() {
    appState.useCachedData = true;
    document.getElementById('errorBanner').style.display = 'block';
});