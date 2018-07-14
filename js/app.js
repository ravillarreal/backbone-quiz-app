var App = App || {};

App.User = Backbone.Model.extend({
	defaults: {
		user: '',
		name: '',
		email: '',
		pass: '',
		scores: [0,0,0,0]
	}
});

App.Users = Backbone.Collection.extend({
	model: App.User,
	localStorage: new Backbone.LocalStorage('users-backbone')
});

App.users = new App.Users();

App.Questions = Backbone.Model.extend({
	url: 'questions.json',

	defaults: {
		history: [],
		entertainment: [],
		science: [],
		art: []
	}
});

App.PageView = Backbone.View.extend({
	id: 'page-view',
	template: App.templateManager.getCachedTemplate('index'),
	render: function(){
		this.$el.html(this.template(this.model.toJSON()));
		return this;
	}
});

App.LoginView = Backbone.View.extend({
	id: 'login-view',
	template: App.templateManager.getCachedTemplate('login'),
	
	events: {
		'submit #login': 'loginUser',
		'submit #register': 'registerUser'
	},

	render: function(){
		this.$el.html(this.template({}));
		return this;
	},

	loginUser: function(e){
		console.log('login user...')
		e.preventDefault();
		var form = document.getElementById('login');
		if (App.users.length > 0) {
			App.users.forEach(function(model, index){
				if (form.userField.value === model.get('user')
				&& form.passwordField.value === model.get('pass')) {
					sessionStorage.setItem('user-id', model.get('id'));
					App.router.navigate('#index', {trigger: true});
				}

				else if (index === App.users.length && form.userField.value !== model.get('user')) {
					alert('El usuario o contraseña son incorrectos');
				}
			});
		} else {
			alert('No hay usuarios! Por favor registre uno');
		}
	},

	registerUser: function(e){
		console.log('registering user...');
		e.preventDefault();
		var exist;
		var form = document.getElementById('register');
		if (App.users.length > 0) {
			App.users.forEach(function(model,index){
				console.log('hey');
				if (form.userField.value === model.get('user')) {
					alert('El usuario ya existe');
					exist = true;
				} else if (index = App.users.length-1) {
					exist = false;
				}
			});
		} else {
			exist = false;
		}
		if (!exist) {
			App.users.create({
				name: form.nameField.value,
				user: form.userField.value,
				email: form.emailField.value,
				pass: form.passwordField.value
			});
			alert('El usuario se ha creado exitosamente');
			this.render();
		}
	}
});

App.ProfileView = Backbone.View.extend({
	id: 'profile-view',
	template: App.templateManager.getCachedTemplate('profile'),

	render: function(){
		this.$el.html(this.template(this.model.toJSON()));
		return this;
	}
});

App.RankingView = Backbone.View.extend({
	id: 'ranking-view',
	template: App.templateManager.getCachedTemplate('ranking'),
	sortedScores: {history: [], entertainment: [], science: [], art:[]},
	initialize: function(){
		this.sortScores(this.collection);
	},

	sortScores: function(collection){
		var count = 0;
		_.each(this.sortedScores, function(value,key,list){
			list[key] = _.sortBy(collection.models, function(model) {
				return model.attributes.scores[count]
			}).reverse();
			count++;
		});
	},

	render: function(){
		this.$el.html(this.template(this.sortedScores));
		return this;
	}
});

App.GameView = Backbone.View.extend({
	id: 'game-view',
	template: App.templateManager.getCachedTemplate('game'),
	model: new Backbone.Model(),

	events: {
		'click .btn-options button': 'validateAnswer',
		'click #next-btn': 'nextQuestion'
	},

	initialize: function(options){
		App.questionNumber = 0;
		App.score = 0;
		this.questions = new App.Questions();
		this.category = options.category;
		this.questions.fetch({
			success: function(){
				console.log('Questions loaded!');
				App.mainView.subView.chooseQuestion(0,this.category);
				App.questionNumber++;
			},
			error: function(){
				console.log('Questions could not be loaded');
				App.router.navigate('#loadError', {trigger: true});	
			}
		});
		this.listenTo(this.model, 'change', this.render);
		this.on('timeUp', this.validateAnswer);
		
	},

	nextQuestion: function(){
		if (App.questionNumber < this.questions.get(this.category).length) {
			this.chooseQuestion(App.questionNumber,this.category);
			App.questionNumber++;
		} else {
			this.model.clear({silent: true});
			this.model.set({category: this.category});
			$('#points').html(App.score);
			if(sessionStorage.getItem('user-id')) {
				var user = App.users.get(sessionStorage.getItem('user-id'));
				switch(this.category) {
					case 'history': 
						user.attributes.scores[0] = App.score;
						break;
					case 'entertainment':
						user.attributes.scores[1] = App.score;
						break;
					case 'science':
						user.attributes.scores[2] = App.score;
						break;
					case 'art':
						user.attributes.scores[3] = App.score;
						break;
				}
				user.save();
			} else {
				$('#message').html('No has iniciado sessión, tu puntaje no se guardará');
			}
		}
	},

	chooseQuestion: function(number, category){
		var questions = this.questions;
		var category = this.category;
		this.model.set({
			question: questions.get(category)[number].question,
			answers: questions.get(category)[number].answers,
			correct_answer: questions.get(category)[number].correct_answer,
			category: category
		});
		$('#points').html(App.score);
		App.countDown = 10;
		window.x = setInterval(function(){
			$('#time').html(App.countDown);
			App.countDown--;
			if (App.countDown < 0) {
				App.mainView.subView.trigger('timeUp');
				clearInterval(window.x);
			}
		},1000);
	},

	validateAnswer: function(e) {
		$('.btn-options button').prop('disabled', true);
		if(e) {
			var target = '#' + e.target.id;
			var correct_answer = '#' + this.model.attributes.correct_answer;
			if (e.target.id == this.model.get('correct_answer')) {
			App.score += 10; 
			$(target).addClass('btn-success');
			clearInterval(window.x);

			} else if (e.target.id != this.model.get('correct_answer')) {
				App.score -= 10;
				$(target).addClass('btn-danger');
				$(correct_answer).addClass('btn-success');
				clearInterval(window.x);

			} 
		} else if (App.countDown < 0) {
			$('#next-btn').removeAttr('disabled');
		}
		$('#next-btn').removeAttr('disabled');
		$('#points').html(App.score);
	},

	render: function() {
		this.$el.html(this.template(this.model.toJSON()));
		return this;
	}
});

App.NavbarView = Backbone.View.extend({
	el: '#main-view',
	subView: {},
	events: {
		'click #logout': 'closeSession'
	},

	initialize: function(){
		this.subView = new App.PageView({model: this.model});
		App.users.fetch();
		this.render();
	},

	template: App.templateManager.getCachedTemplate('navbar'),

	closeSession: function(){
		sessionStorage.clear();
		this.render();
	},

	render: function(){
		this.$el.html(this.template(this.model.toJSON()));
		this.$('#sub-view').html(this.subView.render().el);
		return this;
	},

	changeView: function(path, category){
		this.subView.undelegateEvents();
		this.subView.remove();
		this.model = App.users.get(sessionStorage.getItem('user-id')) || new Backbone.Model(); //ESTO NO ESTA BIEN
		if (path === 'login') {
			this.subView = new App.LoginView();
		} else if (path === 'profile') {
			this.subView = new App.ProfileView({model: this.model});
		} else if (path === 'game') {
			this.subView = new App.GameView({category: category});
		} else if (path === 'ranking') {
			this.subView = new App.RankingView({collection: App.users});
		} else { //ESTO ESTA MAL
			this.subView = new App.PageView({model: this.model});
			this.subView.template = App.templateManager.getCachedTemplate(path);
		}
		this.render();
	},
});

App.mainView = new App.NavbarView({
	model: App.users.get(sessionStorage.getItem('user-id')) || new Backbone.Model()
});

App.Router = Backbone.Router.extend({
	routes: {
		":path": "changeView",
		":path/:quizNum": "changeView"
	},

	changeView: function(path, quizNum){
		App.mainView.changeView(path, quizNum);
	}
});

App.router = new App.Router();
Backbone.history.start();