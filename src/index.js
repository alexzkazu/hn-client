import './styles.scss';

var models = {

	stories:[],
	loaded:0,

	getTopStories: function(){
		var url = 'https://hacker-news.firebaseio.com/v0/topstories.json?print=pretty';
		return fetch(url)
			.then(function(res){
				return res.json();
			})
			.catch(function(err){
			});
	},

	getTopStory: function(id){
		return new Promise(function(resolve,reject){
			var url = 'https://hacker-news.firebaseio.com/v0/item/'+ id + '.json?print=pretty'
			fetch(url)
			.then(function(res){
				resolve(res.json());
			})
			.catch(function(err){
				reject(err);
			});
		});
	}
};

var views = {

	renderTopStory: function(i,obj){
		var div = document.createElement('div');
		console.log(obj);
    	div.className = 'storyContainer';
	    div.innerHTML = '<div class="number">'+ i +'.</div>'
	    			  + '<div class="storyBox">'
	    			  + '<div class="storyTitle"><a href="'+ obj.url + '">' + obj.title + '</a></div>'
	    			  + '<div class="metaInfo">'+ obj.score + ' points | <a href="/comments/'+ obj.id + '">' + obj.descendants + ' comments</a></div>'
	    			  + '</div>';
     	document.getElementById('content').appendChild(div);
	},

	renderMoreButton: function(){
		var div = document.createElement('div');
		div.id = 'moreButton';
		div.innerHTML = '<a href="#">More</a>';
		document.getElementById('app').appendChild(div);
		document.getElementById("moreButton").addEventListener("click", controllers.loadMoreStories);
	}
}

var controllers = {

	createTopStoriesPage: function(){
		models.getTopStories().then(function(ids){

			var promises = [];
			for (var i=0;i<120;i++){
				promises.push(models.getTopStory(ids[i]));
			}
			return Promise.all(promises);
		})
		.then(function(resp){
			models.stories = resp;
			models.loaded += 1;

			//render views
			for (var i=0;i<30;i++){
				views.renderTopStory(i+1,resp[i]);
			}
			views.renderMoreButton();
			document.getElementById('alignBox').classList.add('hidden');

		});
	},

	loadMoreStories: function(e){
		e.preventDefault();

		for (var i = 30 * models.loaded; i < 30 * (models.loaded+1); i++){
			views.renderTopStory(i+1,models.stories[i]);
		}
		models.loaded++;
	}
};

var init = function(){
	controllers.createTopStoriesPage();
};

init();