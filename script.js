// Configuration Sanity
const sanityConfig = {
    projectId: 'ge6gluia',
    dataset: 'production',
    useCdn: true,
    apiVersion: '2023-05-03'
};

// Client Sanity
const sanityClient = sanity.createClient(sanityConfig);

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
    console.log('DOM loaded, initializing app...');
    initializeApp();
    setupEventListeners();
    loadCachedData();
    fetchAllData();
});

// Initialisation de l'application
function initializeApp() {
    console.log('Initializing app...');
    // Afficher la page d'accueil par défaut
    showPage('accueil');
    
    // Initialiser le calendrier
    initializeCalendar();
    
    // Vérifier la connexion
    checkConnection();
}

// Configuration des écouteurs d'événements
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Navigation principale
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const pageId = this.getAttribute('href').substring(1);
            console.log('Navigation clicked:', pageId);
            showPage(pageId);
        });
    });
    
    // Menu mobile
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', function() {
            console.log('Mobile menu clicked');
            this.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }
    
    // Fermer le bandeau d'erreur
    const closeErrorBtn = document.querySelector('.close-error');
    if (closeErrorBtn) {
        closeErrorBtn.addEventListener('click', function() {
            console.log('Closing error banner');
            document.getElementById('errorBanner').style.display = 'none';
        });
    }
    
    // Navigation du calendrier - FIXED: Direct event listeners
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', function() {
            console.log('Previous month clicked');
            changeMonth(-1);
        });
    } else {
        console.error('prevMonth button not found');
    }
    
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', function() {
            console.log('Next month clicked');
            changeMonth(1);
        });
    } else {
        console.error('nextMonth button not found');
    }
    
    // Changement de vue du calendrier - FIXED: Direct event listeners
    const monthViewBtn = document.getElementById('monthView');
    const weekViewBtn = document.getElementById('weekView');
    
    if (monthViewBtn) {
        monthViewBtn.addEventListener('click', function() {
            console.log('Month view clicked');
            switchCalendarView('month');
        });
    } else {
        console.error('monthView button not found');
    }
    
    if (weekViewBtn) {
        weekViewBtn.addEventListener('click', function() {
            console.log('Week view clicked');
            switchCalendarView('week');
        });
    } else {
        console.error('weekView button not found');
    }
    
    // Fermeture des modales - FIXED
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('close-modal')) {
            console.log('Close modal clicked');
            e.preventDefault();
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
            }
        }
    });
    
    // Fermer les modales en cliquant à l'extérieur
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                console.log('Closing modal by clicking outside');
                this.classList.remove('active');
            }
        });
    });
}

// Navigation entre les pages
function showPage(pageId) {
    console.log('Showing page:', pageId);
    
    // Mettre à jour la navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const activeLink = document.querySelector(`a[href="#${pageId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Masquer toutes les pages
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Afficher la page sélectionnée
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Fermer le menu mobile
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.classList.remove('active');
        navLinks.classList.remove('active');
    }
    
    // Mettre à jour l'état
    appState.currentPage = pageId;
    
    // Actions spécifiques à chaque page
    switch(pageId) {
        case 'calendrier':
            console.log('Rendering calendar page');
            renderCalendar();
            break;
        case 'actualites':
            console.log('Rendering news page');
            renderNews();
            break;
        case 'professeurs':
            console.log('Rendering teachers page');
            renderTeachers();
            break;
        case 'delegues':
            console.log('Rendering delegates page');
            renderDelegates();
            break;
    }
}

// Gestion des données Sanity
async function fetchAllData() {
    console.log('Fetching all data from Sanity...');
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
        
        console.log('Data fetched successfully:', {
            devoirs: devoirs?.length || 0,
            examens: examens?.length || 0,
            evenements: evenements?.length || 0,
            actualites: actualites?.length || 0,
            professeurs: professeurs?.length || 0,
            delegues: delegues?.length || 0,
            matieres: matieres?.length || 0
        });
        
        // Mettre à jour le cache
        appState.cachedData = {
            devoirs: devoirs || [],
            examens: examens || [],
            evenements: evenements || [],
            actualites: actualites || [],
            professeurs: professeurs || getDefaultTeachers(),
            delegues: delegues || getDefaultDelegates(),
            matieres: matieres || []
        };
        
        // Sauvegarder dans le localStorage
        localStorage.setItem('premiereC_cache', JSON.stringify(appState.cachedData));
        localStorage.setItem('premiereC_cache_timestamp', new Date().toISOString());
        
        // Mettre à jour l'interface
        updateUIWithCachedData();
        
        // Masquer le bandeau d'erreur si nécessaire
        if (appState.useCachedData) {
            const errorBanner = document.getElementById('errorBanner');
            if (errorBanner) {
                errorBanner.style.display = 'none';
            }
            appState.useCachedData = false;
        }
        
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        
        // Utiliser les données en cache
        appState.useCachedData = true;
        updateUIWithCachedData();
        
        // Afficher le bandeau d'erreur
        const errorBanner = document.getElementById('errorBanner');
        if (errorBanner) {
            errorBanner.style.display = 'block';
        }
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
            console.log('Loaded cached data from localStorage');
        }
    }
}

// Mettre à jour l'interface avec les données en cache
function updateUIWithCachedData() {
    console.log('Updating UI with cached data');
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
        const errorBanner = document.getElementById('errorBanner');
        if (errorBanner) {
            errorBanner.style.display = 'block';
        }
    }
}

// REQUÊTES SANITY

// Récupérer les devoirs
async function fetchDevoirs() {
    const query = `*[_type == "devoir"]{
        _id,
        title,
        description,
        date,
        matiere->{name},
        "teacher": teacher->{name}
    }`;
    
    try {
        return await sanityClient.fetch(query);
    } catch (error) {
        console.error('Erreur lors du chargement des devoirs:', error);
        return [];
    }
}

// Récupérer les examens
async function fetchExamens() {
    const query = `*[_type == "examen"]{
        _id,
        title,
        description,
        date,
        matiere->{name},
        "teacher": teacher->{name}
    }`;
    
    try {
        return await sanityClient.fetch(query);
    } catch (error) {
        console.error('Erreur lors du chargement des examens:', error);
        return [];
    }
}

// Récupérer les événements
async function fetchEvenements() {
    const query = `*[_type == "evenement"]{
        _id,
        title,
        description,
        date,
        location
    }`;
    
    try {
        return await sanityClient.fetch(query);
    } catch (error) {
        console.error('Erreur lors du chargement des événements:', error);
        return [];
    }
}

// Récupérer les actualités
async function fetchActualites() {
    const query = `*[_type == "actualite"] | order(date desc){
        _id,
        title,
        content,
        date,
        "image": image.asset->url
    }`;
    
    try {
        return await sanityClient.fetch(query);
    } catch (error) {
        console.error('Erreur lors du chargement des actualités:', error);
        return [];
    }
}

// Récupérer les professeurs
async function fetchProfesseurs() {
    const query = `*[_type == "professeur"]{
        _id,
        name,
        subjects[]->{name},
        phone,
        email,
        "photo": photo.asset->url
    }`;
    
    try {
        const teachers = await sanityClient.fetch(query);
        return teachers.length > 0 ? teachers : getDefaultTeachers();
    } catch (error) {
        console.error('Erreur lors du chargement des professeurs:', error);
        return getDefaultTeachers();
    }
}

// Récupérer les délégués
async function fetchDelegues() {
    const query = `*[_type == "delegue"]{
        _id,
        name,
        role,
        description,
        contact,
        "photo": photo.asset->url
    }`;
    
    try {
        const delegates = await sanityClient.fetch(query);
        return delegates.length > 0 ? delegates : getDefaultDelegates();
    } catch (error) {
        console.error('Erreur lors du chargement des délégués:', error);
        return getDefaultDelegates();
    }
}

// Récupérer les matières
async function fetchMatieres() {
    const query = `*[_type == "matiere"]{
        _id,
        name
    }`;
    
    try {
        return await sanityClient.fetch(query);
    } catch (error) {
        console.error('Erreur lors du chargement des matières:', error);
        return [];
    }
}

// RENDU DES PAGES

// Page d'accueil
function renderHomePage() {
    console.log('Rendering home page');
    renderRecentNews();
    renderUpcomingEvents();
}

// Actualités récentes
function renderRecentNews() {
    const container = document.getElementById('recentNews');
    if (!container) return;
    
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
                <p>${news.content ? news.content.substring(0, 100) + '...' : ''}</p>
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
    if (!container) return;
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // Combiner tous les événements
    const allEvents = [
        ...appState.cachedData.devoirs.map(d => ({...d, type: 'devoir'})),
        ...appState.cachedData.examens.map(e => ({...e, type: 'examen'})),
        ...appState.cachedData.evenements.map(e => ({...e, type: 'evenement'}))
    ];
    
    // Filtrer les événements à venir (dans les 30 prochains jours)
    const upcomingEvents = allEvents
        .filter(event => {
            const eventDate = new Date(event.date);
            eventDate.setHours(0, 0, 0, 0);
            return eventDate >= now;
        })
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
    if (currentMonthElement) {
        currentMonthElement.textContent = formatMonthYear(appState.currentDate);
        console.log('Calendar initialized with date:', appState.currentDate);
    }
}

// Changer de mois - COMPLETELY FIXED
function changeMonth(direction) {
    console.log('Changing month, direction:', direction);
    console.log('Current date before change:', appState.currentDate);
    
    // Create a completely new date object to avoid any reference issues
    const newDate = new Date(appState.currentDate.getTime());
    newDate.setMonth(newDate.getMonth() + direction);
    appState.currentDate = newDate;
    
    console.log('New date after change:', appState.currentDate);
    
    const currentMonthElement = document.getElementById('currentMonth');
    if (currentMonthElement) {
        currentMonthElement.textContent = formatMonthYear(appState.currentDate);
        console.log('Updated month display to:', formatMonthYear(appState.currentDate));
    }
    
    renderCalendar();
}

// Changer de vue calendrier
function switchCalendarView(view) {
    console.log('Switching calendar view to:', view);
    
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelectorAll('.calendar-view').forEach(viewEl => {
        viewEl.classList.remove('active');
    });
    
    if (view === 'month') {
        const monthViewBtn = document.getElementById('monthView');
        const monthlyView = document.getElementById('monthlyView');
        if (monthViewBtn && monthlyView) {
            monthViewBtn.classList.add('active');
            monthlyView.classList.add('active');
        }
    } else {
        const weekViewBtn = document.getElementById('weekView');
        const weeklyView = document.getElementById('weeklyView');
        if (weekViewBtn && weeklyView) {
            weekViewBtn.classList.add('active');
            weeklyView.classList.add('active');
        }
    }
    
    renderCalendar();
}

// Rendu du calendrier
function renderCalendar() {
    console.log('Rendering calendar for date:', appState.currentDate);
    
    const currentView = document.querySelector('.calendar-view.active');
    if (!currentView) {
        console.error('No active calendar view found');
        return;
    }
    
    const currentViewId = currentView.id;
    console.log('Active view:', currentViewId);
    
    if (currentViewId === 'monthlyView') {
        renderMonthlyCalendar();
    } else {
        renderWeeklyCalendar();
    }
}

// Rendu du calendrier mensuel
function renderMonthlyCalendar() {
    const container = document.getElementById('calendarGrid');
    if (!container) {
        console.error('Calendar grid container not found');
        return;
    }
    
    const year = appState.currentDate.getFullYear();
    const month = appState.currentDate.getMonth();
    
    console.log('Rendering monthly calendar for:', year, month);
    
    // Premier jour du mois
    const firstDay = new Date(year, month, 1);
    // Dernier jour du mois
    const lastDay = new Date(year, month + 1, 0);
    
    // Jour de la semaine du premier jour (0 = dimanche, 1 = lundi, etc.)
    let firstDayOfWeek = firstDay.getDay();
    // Ajuster pour commencer le lundi
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    console.log('First day of month:', firstDay, 'Day of week:', firstDay.getDay(), 'Adjusted:', firstDayOfWeek);
    console.log('Last day of month:', lastDay);
    
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
        const dayEvents = allEvents.filter(event => {
            const eventDate = new Date(event.date);
            eventDate.setHours(0, 0, 0, 0);
            const compareDate = new Date(currentDate);
            compareDate.setHours(0, 0, 0, 0);
            return formatDateForAPI(eventDate) === formatDateForAPI(compareDate);
        });
        
        // Créer les indicateurs d'événements
        const eventIndicators = dayEvents.map(event => 
            `<div class="event-indicator indicator-${event.color}"></div>`
        ).join('');
        
        const isToday = isSameDay(currentDate, new Date());
        const todayClass = isToday ? ' today' : '';
        
        calendarHTML += `
            <div class="calendar-day${todayClass}" data-date="${dateString}">
                <div class="calendar-day-number">${day}</div>
                <div class="event-indicators">${eventIndicators}</div>
            </div>
        `;
    }
    
    container.innerHTML = calendarHTML;
    console.log('Calendar grid rendered with', lastDay.getDate(), 'days');
    
    // Ajouter les écouteurs d'événements pour les jours
    const dayElements = document.querySelectorAll('.calendar-day:not(.empty)');
    console.log('Found', dayElements.length, 'day elements to add event listeners to');
    
    dayElements.forEach(day => {
        day.addEventListener('click', function() {
            const date = this.getAttribute('data-date');
            console.log('Day clicked:', date);
            showEventDetails(date);
        });
    });
}

// Rendu du calendrier hebdomadaire
function renderWeeklyCalendar() {
    const weekHeader = document.getElementById('weekHeader');
    const weekGrid = document.getElementById('weekGrid');
    
    if (!weekHeader || !weekGrid) {
        console.error('Weekly calendar elements not found');
        return;
    }
    
    const year = appState.currentDate.getFullYear();
    const month = appState.currentDate.getMonth();
    const date = appState.currentDate.getDate();
    
    console.log('Rendering weekly calendar for:', year, month, date);
    
    // Premier jour de la semaine (lundi)
    const firstDayOfWeek = new Date(year, month, date);
    const dayOfWeek = firstDayOfWeek.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    firstDayOfWeek.setDate(date + diffToMonday);
    
    console.log('First day of week (Monday):', firstDayOfWeek);
    
    let headerHTML = '';
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
        
        const isToday = isSameDay(currentDate, new Date());
        const todayClass = isToday ? ' today' : '';
        
        // En-tête
        headerHTML += `
            <div class="week-day-header${todayClass}">
                ${formatDayName(currentDate.getDay())}<br>
                ${currentDate.getDate()}
            </div>
        `;
        
        // Événements de ce jour
        const dayEvents = allEvents.filter(event => {
            const eventDate = new Date(event.date);
            eventDate.setHours(0, 0, 0, 0);
            const compareDate = new Date(currentDate);
            compareDate.setHours(0, 0, 0, 0);
            return formatDateForAPI(eventDate) === formatDateForAPI(compareDate);
        });
        
        const eventsHTML = dayEvents.map(event => `
            <div class="week-event event-${event.color}">
                ${event.title}
            </div>
        `).join('');
        
        gridHTML += `
            <div class="week-day${todayClass}" data-date="${dateString}">
                ${eventsHTML}
            </div>
        `;
    }
    
    weekHeader.innerHTML = headerHTML;
    weekGrid.innerHTML = gridHTML;
    
    console.log('Weekly calendar rendered');
    
    // Ajouter les écouteurs d'événements pour les jours
    document.querySelectorAll('.week-day').forEach(day => {
        day.addEventListener('click', function() {
            const date = this.getAttribute('data-date');
            console.log('Week day clicked:', date);
            showEventDetails(date);
        });
    });
}

// Afficher les détails des événements d'une date
function showEventDetails(dateString) {
    console.log('Showing event details for:', dateString);
    
    const date = new Date(dateString);
    const modal = document.getElementById('eventModal');
    const modalDate = document.getElementById('modalDate');
    const modalEvents = document.getElementById('modalEvents');
    
    if (!modal || !modalDate || !modalEvents) {
        console.error('Event modal elements not found');
        return;
    }
    
    modalDate.textContent = formatFullDate(date);
    
    // Combiner tous les événements
    const allEvents = [
        ...appState.cachedData.devoirs.map(d => ({...d, type: 'devoir', className: 'modal-event-homework'})),
        ...appState.cachedData.examens.map(e => ({...e, type: 'examen', className: 'modal-event-exam'})),
        ...appState.cachedData.evenements.map(e => ({...e, type: 'evenement', className: 'modal-event-event'}))
    ];
    
    // Filtrer les événements de cette date
    const dayEvents = allEvents.filter(event => {
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        const compareDate = new Date(date);
        compareDate.setHours(0, 0, 0, 0);
        return formatDateForAPI(eventDate) === formatDateForAPI(compareDate);
    });
    
    console.log('Found', dayEvents.length, 'events for this date');
    
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
    console.log('Event modal opened');
}

// ACTUALITÉS

// Rendu des actualités
function renderNews() {
    const container = document.getElementById('newsContainer');
    if (!container) return;
    
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
                <p>${news.content || ''}</p>
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
    if (!container) return;
    
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
            const teacherId = this.getAttribute('data-teacher-id');
            console.log('Teacher card clicked:', teacherId);
            showTeacherDetails(teacherId);
        });
    });
}

// Afficher les détails d'un professeur
function showTeacherDetails(teacherId) {
    console.log('Showing teacher details for:', teacherId);
    
    const teacher = appState.cachedData.professeurs.find(t => 
        (t._id || t.name) === teacherId
    );
    
    if (!teacher) {
        console.error('Teacher not found:', teacherId);
        return;
    }
    
    const modal = document.getElementById('teacherModal');
    const container = document.getElementById('teacherDetails');
    
    if (!modal || !container) {
        console.error('Teacher modal elements not found');
        return;
    }
    
    // Récupérer les devoirs et examens de ce professeur
    const teacherSubjects = teacher.subjects ? teacher.subjects.map(s => s.name) : [];
    const upcomingHomeworks = appState.cachedData.devoirs
        .filter(d => teacherSubjects.includes(d.matiere?.name))
        .filter(d => {
            const hwDate = new Date(d.date);
            hwDate.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return hwDate >= today;
        })
        .slice(0, 5);
    
    const upcomingExams = appState.cachedData.examens
        .filter(e => teacherSubjects.includes(e.matiere?.name))
        .filter(e => {
            const examDate = new Date(e.date);
            examDate.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return examDate >= today;
        })
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
    console.log('Teacher modal opened');
}

// DÉLÉGUÉS

// Rendu des délégués
function renderDelegates() {
    const container = document.getElementById('delegatesGrid');
    if (!container) return;
    
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
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Vérifier si deux dates sont le même jour
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
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
            _id: 'delegate3',
            name: 'Andrew Zein',
            role: 'Éco-Délégué(e)',
            description: 'Responsable des initiatives écologiques de la classe et de la sensibilisation aux enjeux environnementaux.',
            contact: 'https://wa.me/123456791',
            photo: 'placeholder-delegate.jpg'
        }
    ];
}

// Gestion de la déconnexion/réconnection
window.addEventListener('online', function() {
    console.log('Connection restored, fetching data...');
    fetchAllData();
});

window.addEventListener('offline', function() {
    console.log('Connection lost, using cached data');
    appState.useCachedData = true;
    const errorBanner = document.getElementById('errorBanner');
    if (errorBanner) {
        errorBanner.style.display = 'block';
    }
});