import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = {
  code: string;
  name: string;
  nativeName: string;
};

export const availableLanguages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' }
];

type Translations = {
  [key: string]: {
    [langCode: string]: string;
  };
};

const translations: Translations = {
  home: {
    en: 'Home',
    es: 'Inicio',
  },
  storage: {
    en: 'Storage',
    es: 'Almacenamiento',
    fr: 'Stockage',
    de: 'Speicher',
    it: 'Archiviazione',
    pt: 'Armazenamento'
  },
  feedViewer: {
    en: 'Feed Viewer',
    es: 'Visor de Alimentación',
    fr: 'Visionneur d\'Alimentation',
    de: 'Fütterungsbetrachter',
    it: 'Visualizzatore Alimentazione',
    pt: 'Visualizador de Alimentação'
  },
  covers: {
    en: 'Covers',
    es: 'Cubiertas',
    fr: 'Couvertures',
    de: 'Abdeckungen',
    it: 'Coperture',
    pt: 'Coberturas'
  },
  events: {
    en: 'Events',
    es: 'Eventos',
    fr: 'Événements',
    de: 'Ereignisse',
    it: 'Eventi',
    pt: 'Eventos'
  },
  audits: {
    en: 'Audits',
    es: 'Auditorías',
  },
  stats: {
    en: 'Stats',
    es: 'Estadísticas',
    fr: 'Statistiques',
    de: 'Statistiken',
    it: 'Statistiche',
    pt: 'Estatísticas'
  },
  materials: {
    en: 'Materials',
    es: 'Materiales',
    fr: 'Matériaux',
    de: 'Materialien',
    it: 'Materiali',
    pt: 'Materiais'
  },
  users: {
    en: 'Users',
    es: 'Usuarios',
    fr: 'Utilisateurs',
    de: 'Benutzer',
    it: 'Utenti',
    pt: 'Usuários'
  },
  settings: {
    en: 'Settings',
    es: 'Configuración',
    fr: 'Paramètres',
    de: 'Einstellungen',
    it: 'Impostazioni',
    pt: 'Configurações'
  },
  darkMode: {
    en: 'Dark Mode',
    es: 'Modo Oscuro',
    fr: 'Mode Sombre',
    de: 'Dunkelmodus',
    it: 'Modalità Scura',
    pt: 'Modo Escuro'
  },
  language: {
    en: 'Language',
    es: 'Idioma',
    fr: 'Langue',
    de: 'Sprache',
    it: 'Lingua',
    pt: 'Idioma'
  },
  availableLanguages: {
    en: 'Available Languages',
    es: 'Idiomas Disponibles',
    fr: 'Langues Disponibles',
    de: 'Verfügbare Sprachen',
    it: 'Lingue Disponibili',
    pt: 'Idiomas Disponíveis'
  },
  selectLanguage: {
    en: 'Select Language',
    es: 'Seleccionar Idioma',
    fr: 'Sélectionner la Langue',
    de: 'Sprache Auswählen',
    it: 'Seleziona Lingua',
    pt: 'Selecionar Idioma'
  },
  addLanguage: {
    en: 'Add Language',
    es: 'Agregar Idioma',
    fr: 'Ajouter une Langue',
    de: 'Sprache Hinzufügen',
    it: 'Aggiungi Lingua',
    pt: 'Adicionar Idioma'
  },
  removeLanguage: {
    en: 'Remove Language',
    es: 'Eliminar Idioma',
    fr: 'Supprimer la Langue',
    de: 'Sprache Entfernen',
    it: 'Rimuovi Lingua',
    pt: 'Remover Idioma'
  },
  en: {
    home: 'Home',
    storage: 'Storage',
    feedviewer: 'Feed Viewer',
    covers: 'Covers',
    events: 'Events',
    audits: 'Audits',
    stats: 'Stats',
    materials: 'Materials',
    users: 'Users',
    setup: 'Setup',
    settings: 'Settings',
    darkMode: 'Dark Mode',
  },
  userAuthentication: {
    en: 'User Authentication',
    es: 'Autenticación de Usuario',
  },
  selectOrganization: {
    en: 'Select Organization',
    es: 'Seleccionar Organización',
    fr: 'Sélectionner l\'Organisation',
    de: 'Organisation Auswählen',
    it: 'Seleziona Organizzazione',
    pt: 'Selecionar Organização'
  },
  selectOrganizationDescription: {
    en: 'Please select an organization from the list below',
    es: 'Por favor seleccione una organización de la lista',
  },
  selectDepartment: {
    en: 'Select Department',
    es: 'Seleccionar Departamento',
    fr: 'Sélectionner le Département',
    de: 'Abteilung Auswählen',
    it: 'Seleziona Dipartimento',
    pt: 'Selecionar Departamento'
  },
  selectDepartmentDescription: {
    en: 'Please select a department from the list below',
    es: 'Por favor seleccione un departamento de la lista',
  },
  selectFeedType: {
    en: 'Select Feed Type',
    es: 'Seleccionar Tipo de Alimento',
    fr: 'Sélectionner le Type d\'Alimentation',
    de: 'Fütterungstyp Auswählen',
    it: 'Seleziona Tipo di Alimentazione',
    pt: 'Selecionar Tipo de Alimentação'
  },
  selectFeedTypeDescription: {
    en: 'Please select a feed type from the list below',
    es: 'Por favor seleccione un tipo de alimento de la lista',
  },
  summary: {
    en: 'Summary',
    es: 'Resumen',
    fr: 'Résumé',
    de: 'Zusammenfassung',
    it: 'Riepilogo',
    pt: 'Resumo'
  },
  summaryDescription: {
    en: 'Review the feed details before submission',
    es: 'Revise los detalles del alimento antes de enviar',
  },
  pleaseEnterPin: {
    en: 'Please enter your PIN to continue',
    es: 'Por favor ingrese su PIN para continuar',
  },
  trackingStatistics: {
    en: 'Tracking Statistics',
    es: 'Estadísticas de Seguimiento',
    fr: 'Statistiques de Suivi',
    de: 'Verfolgungsstatistiken',
    it: 'Statistiche di Monitoraggio',
    pt: 'Estatísticas de Rastreamento'
  },
  today: {
    en: 'Today',
    es: 'Hoy',
    fr: "Aujourd'hui",
    de: 'Heute',
    it: 'Oggi',
    pt: 'Hoje'
  },
  thisWeek: {
    en: 'This Week',
    es: 'Esta Semana',
    fr: 'Cette Semaine',
    de: 'Diese Woche',
    it: 'Questa Settimana',
    pt: 'Esta Semana'
  },
  thisMonth: {
    en: 'This Month',
    es: 'Este Mes',
    fr: 'Ce Mois',
    de: 'Dieser Monat',
    it: 'Questo Mese',
    pt: 'Este Mês'
  },
  thisYear: {
    en: 'This Year',
    es: 'Este Año',
    fr: "Cette Année",
    de: 'Dieses Jahr',
    it: 'Quest\'Anno',
    pt: 'Este Ano'
  },
  allTime: {
    en: 'All Time',
    es: 'Todo el Tiempo',
    fr: 'Tout le Temps',
    de: 'Gesamtzeit',
    it: 'Tutto il Tempo',
    pt: 'Todo o Tempo'
  },
  enterPinToStart: {
    en: 'Enter PIN to Start Feed',
    es: 'Ingrese PIN para Iniciar Alimentación',
    fr: 'Entrez le PIN pour Démarrer l\'Alimentation',
    de: 'PIN eingeben, um Fütterung zu starten',
    it: 'Inserisci PIN per Iniziare l\'Alimentazione',
    pt: 'Digite o PIN para Iniciar Alimentação'
  },
  invalidPin: {
    en: 'Invalid PIN. Please try again.',
    es: 'PIN inválido. Por favor intente de nuevo.',
    fr: 'PIN invalide. Veuillez réessayer.',
    de: 'Ungültiger PIN. Bitte versuchen Sie es erneut.',
    it: 'PIN non valido. Per favore riprova.',
    pt: 'PIN inválido. Por favor tente novamente.'
  },
  somethingWentWrong: {
    en: 'Something went wrong. Please try again.',
    es: 'Algo salió mal. Por favor intente de nuevo.',
    fr: 'Une erreur est survenue. Veuillez réessayer.',
    de: 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.',
    it: 'Qualcosa è andato storto. Per favore riprova.',
    pt: 'Algo deu errado. Por favor tente novamente.'
  },
  noFeedTypes: {
    en: 'No Feed Types Available',
    es: 'No Hay Tipos de Alimento Disponibles',
    fr: 'Aucun Type d\'Alimentation Disponible',
    de: 'Keine Fütterungstypen Verfügbar',
    it: 'Nessun Tipo di Alimentazione Disponibile',
    pt: 'Nenhum Tipo de Alimentação Disponível'
  },
  addFeedTypes: {
    en: 'Please add feed types in the Audits page to start tracking.',
    es: 'Por favor agregue tipos de alimento en la página de Auditorías para comenzar el seguimiento.',
    fr: 'Veuillez ajouter des types d\'alimentation dans la page Audits pour commencer le suivi.',
    de: 'Bitte fügen Sie Fütterungstypen auf der Seite Audits hinzu, um mit der Verfolgung zu beginnen.',
    it: 'Aggiungi tipi di alimentazione nella pagina Audit per iniziare il monitoraggio.',
    pt: 'Por favor adicione tipos de alimentação na página de Auditorias para começar o rastreamento.'
  },
  goToAudits: {
    en: 'Go to Audits',
    es: 'Ir a Auditorías',
    fr: 'Aller aux Audits',
    de: 'Zu den Audits',
    it: 'Vai agli Audit',
    pt: 'Ir para Auditorias'
  },
  loadCellReading: {
    en: 'Load Cell Reading',
    es: 'Lectura de Célula de Carga',
    fr: 'Lecture de la Cellule de Charge',
    de: 'Wägezellenmessung',
    it: 'Lettura della Cella di Carico',
    pt: 'Leitura da Célula de Carga'
  },
  cameraPreview: {
    en: 'Camera Preview',
    es: 'Vista Previa de la Cámara',
    fr: 'Aperçu de la Caméra',
    de: 'Kameravorschau',
    it: 'Anteprima della Fotocamera',
    pt: 'Visualização da Câmera'
  },
  cameraError: {
    en: 'Failed to access camera. Please check your camera permissions and connection.',
    es: 'Error al acceder a la cámara. Por favor verifique los permisos y la conexión de su cámara.',
    fr: 'Impossible d\'accéder à la caméra. Veuillez vérifier les permissions et la connexion de votre caméra.',
    de: 'Kamera konnte nicht zugegriffen werden. Bitte überprüfen Sie die Kameraberechtigungen und -verbindung.',
    it: 'Impossibile accedere alla fotocamera. Verifica i permessi e la connessione della fotocamera.',
    pt: 'Falha ao acessar a câmera. Por favor verifique as permissões e a conexão da sua câmera.'
  },
  captureImage: {
    en: 'Capture Image',
    es: 'Capturar Imagen',
    fr: 'Capturer l\'Image',
    de: 'Bild Aufnehmen',
    it: 'Cattura Immagine',
    pt: 'Capturar Imagem'
  },
  feedDetails: {
    en: 'Feed Details',
    es: 'Detalles de Alimentación',
    fr: 'Détails de l\'Alimentation',
    de: 'Fütterungsdetails',
    it: 'Dettagli Alimentazione',
    pt: 'Detalhes da Alimentação'
  },
  weight: {
    en: 'Weight',
    es: 'Peso',
    fr: 'Poids',
    de: 'Gewicht',
    it: 'Peso',
    pt: 'Peso'
  },
  binWeight: {
    en: 'Bin Weight',
    es: 'Peso del Contenedor',
    fr: 'Poids du Bac',
    de: 'Behältergewicht',
    it: 'Peso del Contenitore',
    pt: 'Peso do Recipiente'
  },
  organization: {
    en: 'Organization',
    es: 'Organización',
    fr: 'Organisation',
    de: 'Organisation',
    it: 'Organizzazione',
    pt: 'Organização'
  },
  department: {
    en: 'Department',
    es: 'Departamento',
    fr: 'Département',
    de: 'Abteilung',
    it: 'Dipartimento',
    pt: 'Departamento'
  },
  feedType: {
    en: 'Feed Type',
    es: 'Tipo de Alimento',
    fr: 'Type d\'Alimentation',
    de: 'Fütterungstyp',
    it: 'Tipo di Alimentazione',
    pt: 'Tipo de Alimentação'
  },
  cancel: {
    en: 'Cancel',
    es: 'Cancelar',
    fr: 'Annuler',
    de: 'Abbrechen',
    it: 'Annulla',
    pt: 'Cancelar'
  },
  cameraStatus: {
    en: 'Camera Status',
    es: 'Estado de la Cámara',
    fr: 'État de la Caméra',
    de: 'Kamerastatus',
    it: 'Stato della Fotocamera',
    pt: 'Status da Câmera'
  },
  ready: {
    en: 'Ready',
    es: 'Listo',
    fr: 'Prêt',
    de: 'Bereit',
    it: 'Pronto',
    pt: 'Pronto'
  },
  error: {
    en: 'Error',
    es: 'Error',
    fr: 'Erreur',
    de: 'Fehler',
    it: 'Errore',
    pt: 'Erro'
  },
  initializing: {
    en: 'Initializing',
    es: 'Inicializando',
    fr: 'Initialisation',
    de: 'Initialisierung',
    it: 'Inizializzazione',
    pt: 'Inicializando'
  },
  cameraFeed: {
    en: 'Camera Feed',
    es: 'Vista de la Cámara',
    fr: 'Flux de la Caméra',
    de: 'Kamerabild',
    it: 'Feed della Fotocamera',
    pt: 'Visualização da Câmera'
  },
  cameraInactive: {
    en: 'Camera inactive in this step',
    es: 'Cámara inactiva en este paso',
    fr: 'Caméra inactive à cette étape',
    de: 'Kamera in diesem Schritt inaktiv',
    it: 'Fotocamera inattiva in questo passaggio',
    pt: 'Câmera inativa nesta etapa'
  },
  notAvailable: {
    en: 'Not available',
    es: 'No disponible',
    fr: 'Non disponible',
    de: 'Nicht verfügbar',
    it: 'Non disponibile',
    pt: 'Não disponível'
  },
  notSelected: {
    en: 'Not selected',
    es: 'No seleccionado',
    fr: 'Non sélectionné',
    de: 'Nicht ausgewählt',
    it: 'Non selezionato',
    pt: 'Não selecionado'
  },
  feedTypes: {
    en: 'Feed Types',
    es: 'Tipos de Alimentación',
    fr: 'Types d\'Alimentation',
    de: 'Fütterungstypen',
    it: 'Tipi di Alimentazione',
    pt: 'Tipos de Alimentação'
  },
  addFeedType: {
    en: 'Add Feed Type',
    es: 'Agregar Tipo de Alimentación',
    fr: 'Ajouter un Type d\'Alimentation',
    de: 'Fütterungstyp Hinzufügen',
    it: 'Aggiungi Tipo di Alimentazione',
    pt: 'Adicionar Tipo de Alimentação'
  },
  addNewFeedType: {
    en: 'Add New Feed Type',
    es: 'Agregar Nuevo Tipo de Alimentación',
    fr: 'Ajouter un Nouveau Type d\'Alimentation',
    de: 'Neuen Fütterungstyp Hinzufügen',
    it: 'Aggiungi Nuovo Tipo di Alimentazione',
    pt: 'Adicionar Novo Tipo de Alimentação'
  },
  description: {
    en: 'Description',
    es: 'Descripción',
    fr: 'Description',
    de: 'Beschreibung',
    it: 'Descrizione',
    pt: 'Descrição'
  },
  create: {
    en: 'Create',
    es: 'Crear',
    fr: 'Créer',
    de: 'Erstellen',
    it: 'Crea',
    pt: 'Criar'
  },
  enterCustomType: {
    en: 'Enter Custom Type',
    es: 'Ingrese Tipo Personalizado',
    fr: 'Entrer un Type Personnalisé',
    de: 'Benutzerdefinierten Typ Eingeben',
    it: 'Inserisci Tipo Personalizzato',
    pt: 'Digite Tipo Personalizado'
  },
  enterCustomDepartment: {
    en: 'Enter Custom Department',
    es: 'Ingrese Departamento Personalizado',
    fr: 'Entrer un Département Personnalisé',
    de: 'Benutzerdefinierte Abteilung Eingeben',
    it: 'Inserisci Dipartimento Personalizzato',
    pt: 'Digite Departamento Personalizado'
  },
  confirm: {
    en: 'Confirm',
    es: 'Confirmar',
    fr: 'Confirmer',
    de: 'Bestätigen',
    it: 'Conferma',
    pt: 'Confirmar'
  },
  confirmClose: {
    en: 'Are you sure you want to close? Any unsaved changes will be lost.',
    es: '¿Está seguro de que desea cerrar? Cualquier cambio no guardado se perderá.',
    fr: 'Êtes-vous sûr de vouloir fermer ? Toutes les modifications non enregistrées seront perdues.',
    de: 'Sind Sie sicher, dass Sie schließen möchten? Alle nicht gespeicherten Änderungen gehen verloren.',
    it: 'Sei sicuro di voler chiudere? Tutte le modifiche non salvate andranno perse.',
    pt: 'Tem certeza que deseja fechar? Quaisquer alterações não salvas serão perdidas.'
  },
  noStay: {
    en: 'No, Stay',
    es: 'No, Permanecer',
    fr: 'Non, Rester',
    de: 'Nein, Bleiben',
    it: 'No, Rimani',
    pt: 'Não, Ficar'
  },
  yesClose: {
    en: 'Yes, Close',
    es: 'Sí, Cerrar',
    fr: 'Oui, Fermer',
    de: 'Ja, Schließen',
    it: 'Sì, Chiudi',
    pt: 'Sim, Fechar'
  },
  onScreenKeyboard: {
    en: 'On-screen Keyboard',
    es: 'Teclado en Pantalla',
    fr: 'Clavier à l\'Écran',
    de: 'Bildschirmtastatur',
    it: 'Tastiera a Schermo',
    pt: 'Teclado na Tela'
  },
  close: {
    en: 'Close',
    es: 'Cerrar',
    fr: 'Fermer',
    de: 'Schließen',
    it: 'Chiudi',
    pt: 'Fechar'
  },
  activate: {
    en: 'Activate',
    es: 'Activar',
    fr: 'Activer',
    de: 'Aktivieren',
    it: 'Attiva',
    pt: 'Ativar'
  },
  deactivate: {
    en: 'Deactivate',
    es: 'Desactivar',
    fr: 'Désactiver',
    de: 'Deaktivieren',
    it: 'Disattiva',
    pt: 'Desativar'
  },
  imagePreview: {
    en: 'Image Preview',
    es: 'Vista Previa de la Imagen',
    fr: 'Aperçu de l\'Image',
    de: 'Bildvorschau',
    it: 'Anteprima Immagine',
    pt: 'Visualização da Imagem'
  },
  occupancy: {
    en: 'Occupancy',
    es: 'Ocupación',
    fr: 'Occupation',
    de: 'Belegung',
    it: 'Occupazione',
    pt: 'Ocupação'
  },
  occupancyMonitoring: {
    en: 'Occupancy monitoring section coming soon...',
    es: 'Sección de monitoreo de ocupación próximamente...',
    fr: 'Section de surveillance d\'occupation à venir...',
    de: 'Belegungsüberwachungsbereich kommt bald...',
    it: 'Sezione di monitoraggio occupazione in arrivo...',
    pt: 'Seção de monitoramento de ocupação em breve...'
  },
  coversManagement: {
    en: 'Covers management section coming soon...',
    es: 'Sección de gestión de cubiertas próximamente...',
    fr: 'Section de gestion des couvertures à venir...',
    de: 'Abdeckungsverwaltungsbereich kommt bald...',
    it: 'Sezione di gestione coperture in arrivo...',
    pt: 'Seção de gerenciamento de coberturas em breve...'
  },
  history: {
    en: 'History',
    es: 'Historial',
    fr: 'Historique',
    de: 'Verlauf',
    it: 'Cronologia',
    pt: 'Histórico'
  },
  userManagement: {
    en: 'User Management',
    es: 'Gestión de Usuarios',
    fr: 'Gestion des Utilisateurs',
    de: 'Benutzerverwaltung',
    it: 'Gestione Utenti',
    pt: 'Gerenciamento de Usuários'
  },
  addUser: {
    en: 'Add User',
    es: 'Agregar Usuario',
    fr: 'Ajouter un Utilisateur',
    de: 'Benutzer Hinzufügen',
    it: 'Aggiungi Utente',
    pt: 'Adicionar Usuário'
  },
  editUser: {
    en: 'Edit User',
    es: 'Editar Usuario',
    fr: 'Modifier l\'Utilisateur',
    de: 'Benutzer Bearbeiten',
    it: 'Modifica Utente',
    pt: 'Editar Usuário'
  },
  deleteUser: {
    en: 'Delete User',
    es: 'Eliminar Usuario',
    fr: 'Supprimer l\'Utilisateur',
    de: 'Benutzer Löschen',
    it: 'Elimina Utente',
    pt: 'Excluir Usuário'
  },
  userName: {
    en: 'User Name',
    es: 'Nombre de Usuario',
    fr: 'Nom d\'Utilisateur',
    de: 'Benutzername',
    it: 'Nome Utente',
    pt: 'Nome do Usuário'
  },
  userRole: {
    en: 'User Role',
    es: 'Rol de Usuario',
    fr: 'Rôle d\'Utilisateur',
    de: 'Benutzerrolle',
    it: 'Ruolo Utente',
    pt: 'Função do Usuário'
  },
  userStatus: {
    en: 'User Status',
    es: 'Estado del Usuario',
    fr: 'Statut de l\'Utilisateur',
    de: 'Benutzerstatus',
    it: 'Stato Utente',
    pt: 'Status do Usuário'
  },
  active: {
    en: 'Active',
    es: 'Activo',
    fr: 'Actif',
    de: 'Aktiv',
    it: 'Attivo',
    pt: 'Ativo'
  },
  inactive: {
    en: 'Inactive',
    es: 'Inactivo',
    fr: 'Inactif',
    de: 'Inaktiv',
    it: 'Inattivo',
    pt: 'Inativo'
  },
  storageManagement: {
    en: 'Storage Management',
    es: 'Gestión de Almacenamiento',
    fr: 'Gestion du Stockage',
    de: 'Speicherverwaltung',
    it: 'Gestione Archiviazione',
    pt: 'Gerenciamento de Armazenamento'
  },
  storageLocation: {
    en: 'Storage Location',
    es: 'Ubicación de Almacenamiento',
    fr: 'Emplacement de Stockage',
    de: 'Speicherort',
    it: 'Posizione Archiviazione',
    pt: 'Local de Armazenamento'
  },
  storageCapacity: {
    en: 'Storage Capacity',
    es: 'Capacidad de Almacenamiento',
    fr: 'Capacité de Stockage',
    de: 'Speicherkapazität',
    it: 'Capacità di Archiviazione',
    pt: 'Capacidade de Armazenamento'
  },
  storageStatus: {
    en: 'Storage Status',
    es: 'Estado del Almacenamiento',
    fr: 'État du Stockage',
    de: 'Speicherstatus',
    it: 'Stato Archiviazione',
    pt: 'Status do Armazenamento'
  },
  feedHistory: {
    en: 'Feed History',
    es: 'Historial de Alimentación',
    fr: 'Historique d\'Alimentation',
    de: 'Fütterungsverlauf',
    it: 'Cronologia Alimentazione',
    pt: 'Histórico de Alimentação'
  },
  feedDate: {
    en: 'Feed Date',
    es: 'Fecha de Alimentación',
    fr: 'Date d\'Alimentation',
    de: 'Fütterungsdatum',
    it: 'Data Alimentazione',
    pt: 'Data de Alimentação'
  },
  feedTime: {
    en: 'Feed Time',
    es: 'Hora de Alimentación',
    fr: 'Heure d\'Alimentation',
    de: 'Fütterungszeit',
    it: 'Ora Alimentazione',
    pt: 'Hora de Alimentação'
  },
  feedAmount: {
    en: 'Feed Amount',
    es: 'Cantidad de Alimentación',
    fr: 'Quantité d\'Alimentation',
    de: 'Fütterungsmenge',
    it: 'Quantità Alimentazione',
    pt: 'Quantidade de Alimentação'
  },
  feedUser: {
    en: 'Feed User',
    es: 'Usuario de Alimentación',
    fr: 'Utilisateur d\'Alimentation',
    de: 'Fütterungsbenutzer',
    it: 'Utente Alimentazione',
    pt: 'Usuário de Alimentação'
  },
  storageUtilizationDescription: {
    en: 'Please click the (+) button once for each bus bucket you add to storage. Click the (-) button to remove a bucket.',
    es: 'Haga clic en el botón (+) una vez por cada cubo de autobús que agregue al almacenamiento. Haga clic en el botón (-) para eliminar un cubo.',
    fr: 'Cliquez sur le bouton (+) une fois pour chaque seau de bus que vous ajoutez au stockage. Cliquez sur le bouton (-) pour supprimer un seau.',
    de: 'Klicken Sie für jeden Bus-Eimer, den Sie zum Speicher hinzufügen, einmal auf die (+) Schaltfläche. Klicken Sie auf die (-) Schaltfläche, um einen Eimer zu entfernen.',
    it: 'Fare clic sul pulsante (+) una volta per ogni secchio dell\'autobus che si aggiunge allo stoccaggio. Fare clic sul pulsante (-) per rimuovere un secchio.',
    pt: 'Clique no botão (+) uma vez para cada balde de ônibus que você adiciona ao armazenamento. Clique no botão (-) para remover um balde.'
  },
  add: {
    en: 'Add',
    es: 'Agregar',
    fr: 'Ajouter',
    de: 'Hinzufügen',
    it: 'Aggiungi',
    pt: 'Adicionar'
  },
  remove: {
    en: 'Remove',
    es: 'Eliminar',
    fr: 'Supprimer',
    de: 'Entfernen',
    it: 'Rimuovi',
    pt: 'Remover'
  },
  createNewUser: {
    en: 'Create New User',
    es: 'Crear Nuevo Usuario',
    fr: 'Créer un Nouvel Utilisateur',
    de: 'Neuen Benutzer Erstellen',
    it: 'Crea Nuovo Utente',
    pt: 'Criar Novo Usuário'
  },
  activateUser: {
    en: 'Activate User',
    es: 'Activar Usuario',
    fr: 'Activer l\'Utilisateur',
    de: 'Benutzer Aktivieren',
    it: 'Attiva Utente',
    pt: 'Ativar Usuário'
  },
  inactiveUsers: {
    en: 'Inactive Users',
    es: 'Usuarios Inactivos',
    fr: 'Utilisateurs Inactifs',
    de: 'Inaktive Benutzer',
    it: 'Utenti Inattivi',
    pt: 'Usuários Inativos'
  },
  noInactiveUsers: {
    en: 'No inactive users found',
    es: 'No se encontraron usuarios inactivos',
    fr: 'Aucun utilisateur inactif trouvé',
    de: 'Keine inaktiven Benutzer gefunden',
    it: 'Nessun utente inattivo trovato',
    pt: 'Nenhum usuário inativo encontrado'
  },
  enterCode: {
    en: 'Enter Code',
    es: 'Ingrese Código',
    fr: 'Entrer le Code',
    de: 'Code Eingeben',
    it: 'Inserisci Codice',
    pt: 'Digite o Código'
  },
  confirmActivation: {
    en: 'Confirm Activation',
    es: 'Confirmar Activación',
    fr: 'Confirmer l\'Activation',
    de: 'Aktivierung Bestätigen',
    it: 'Conferma Attivazione',
    pt: 'Confirmar Ativação'
  },
  confirmDeactivation: {
    en: 'Confirm Deactivation',
    es: 'Confirmar Desactivación',
    fr: 'Confirmer la Désactivation',
    de: 'Deaktivierung Bestätigen',
    it: 'Conferma Disattivazione',
    pt: 'Confirmar Desativação'
  },
  deactivateUserConfirm: {
    en: 'Are you sure you want to deactivate {name}? This will set their status to inactive and reset their code to 0.',
    es: '¿Está seguro de que desea desactivar a {name}? Esto establecerá su estado como inactivo y restablecerá su código a 0.',
    fr: 'Êtes-vous sûr de vouloir désactiver {name} ? Cela définira leur statut comme inactif et réinitialisera leur code à 0.',
    de: 'Sind Sie sicher, dass Sie {name} deaktivieren möchten? Dies setzt ihren Status auf inaktiv und setzt ihren Code auf 0 zurück.',
    it: 'Sei sicuro di voler disattivare {name}? Questo imposterà il loro stato come inattivo e reimposterà il loro codice a 0.',
    pt: 'Tem certeza que deseja desativar {name}? Isso definirá o status como inativo e redefinirá o código para 0.'
  },
  reactivateUserConfirm: {
    en: 'Are you sure you want to reactivate {name}?',
    es: '¿Está seguro de que desea reactivar a {name}?',
    fr: 'Êtes-vous sûr de vouloir réactiver {name} ?',
    de: 'Sind Sie sicher, dass Sie {name} reaktivieren möchten?',
    it: 'Sei sicuro di voler riattivare {name}?',
    pt: 'Tem certeza que deseja reativar {name}?'
  },
  selectAvatar: {
    en: 'Select Avatar',
    es: 'Seleccionar Avatar',
    fr: 'Sélectionner l\'Avatar',
    de: 'Avatar Auswählen',
    it: 'Seleziona Avatar',
    pt: 'Selecionar Avatar'
  },
  firstName: {
    en: 'First Name',
    es: 'Nombre',
    fr: 'Prénom',
    de: 'Vorname',
    it: 'Nome',
    pt: 'Nome'
  },
  lastInitial: {
    en: 'Last Initial',
    es: 'Inicial del Apellido',
    fr: 'Initiale du Nom',
    de: 'Nachname Initial',
    it: 'Iniziale del Cognome',
    pt: 'Inicial do Sobrenome'
  },
  code: {
    en: 'Code',
    es: 'Código',
    fr: 'Code',
    de: 'Code',
    it: 'Codice',
    pt: 'Código'
  },
  title: {
    en: 'Title',
    es: 'Título',
    fr: 'Titre',
    de: 'Titel',
    it: 'Titolo',
    pt: 'Título'
  },
  saveChanges: {
    en: 'Save Changes',
    es: 'Guardar Cambios',
    fr: 'Enregistrer les Modifications',
    de: 'Änderungen Speichern',
    it: 'Salva Modifiche',
    pt: 'Salvar Alterações'
  },
  enter: {
    en: 'Enter',
    es: 'Entrar',
    fr: 'Entrer',
    de: 'Eingeben',
    it: 'Inserisci',
    pt: 'Entrar'
  }
};

interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
  enabledLanguages: Language[];
  addEnabledLanguage: (language: Language) => void;
  removeEnabledLanguage: (languageCode: string) => void;
  availableLanguages: Language[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(availableLanguages[0]);
  const [enabledLanguages, setEnabledLanguages] = useState<Language[]>(availableLanguages);

  const setLanguage = (language: Language) => {
    setCurrentLanguage(language);
  };

  const t = (key: string): string => {
    return translations[key]?.[currentLanguage.code] || key;
  };

  const addEnabledLanguage = (language: Language) => {
    if (!enabledLanguages.find(lang => lang.code === language.code)) {
      setEnabledLanguages([...enabledLanguages, language]);
    }
  };

  const removeEnabledLanguage = (languageCode: string) => {
    if (languageCode !== 'en') { // Prevent removing English
      setEnabledLanguages(enabledLanguages.filter(lang => lang.code !== languageCode));
      if (currentLanguage.code === languageCode) {
        setCurrentLanguage(availableLanguages[0]); // Switch to English if current language is removed
      }
    }
  };

  return (
    <LanguageContext.Provider value={{
      currentLanguage,
      setLanguage,
      t,
      enabledLanguages,
      addEnabledLanguage,
      removeEnabledLanguage,
      availableLanguages,
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}; 