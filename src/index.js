import './styles.scss';

var page = {
	LANDING: 'landing',
	STORY: 'story'
}

var models = {

	//ideally, we would cache all of this data on a server, and serve that to the client
	stories:[],
	comments:[],
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
	},

	getComments: function(i,obj){
			var promises = [];
			for (var j=0; j< obj.kids.length; j++){
				promises.push(this.getComment(obj.kids[j]));
			}
			return Promise.all(promises);
	},

	getComment: function(id){
		var self = this;
		return new Promise(function(resolve,reject){
			var url = 'https://hacker-news.firebaseio.com/v0/item/'+ id + '.json?print=pretty';
			fetch(url)
			.then(function(res){
				return res.json();
			})
			.then(function(res){
				var result = {
					by: res.by,
					text: res.text,
					id: res.id,
					chainLength:1,
					level:0
				};

				//if comment was deleted, return false
				if(res.deleted){ 
					resolve(false);
				}

				//if there are child comments, run recursively
				if(res.kids){ 
					self.getComments(res.id,res).then(function(array){
						
						var countChainLengthAndLevel = function(array){
							for (var a=0;a< array.length;a++){
								if(array[a] == false){
									continue;
								}
								//if an array, go deeper
								if (array[a] instanceof Array){ 
									countChainLengthAndLevel(array[a]);
								} else { 
									//if an object, increment comment chain length
									result.chainLength += 1;
									//increment the level too
									array[a].level++;
								}
							}
						};
						countChainLengthAndLevel(array);

						resolve([result,array]);
					});
				} else {
					resolve(result);
				}
			})
			.catch(function(err){
				reject(err);
			});
		});

	}
};

var views = {
	defaultSpaceWidth: 40,

	renderTopStory: function(i,obj,pageLoad){
		var div = document.createElement('div');
		var numberString = pageLoad == page.LANDING ? (i+'.') : '';
    	div.className = 'storyContainer';
	    div.innerHTML = '<div class="number ' + pageLoad + '">'+ numberString +'</div>'
	    			  + '<div class="storyBox">'
	    			  + '<div class="storyTitle"><a href="'+ obj.url + '">' + obj.title + '</a></div>'
	    			  + '<div class="metaInfo">'+ obj.score + ' points | <a class="storyLink" data-index= "'+(i-1)+'" data-id="'+ obj.id + '" href="#">' + obj.descendants + ' comments</a></div>'
	    			  + '</div>';

	    var storyLink = div.querySelector('.storyLink');
	    storyLink.addEventListener('click',controllers.goToStoryPage);

     	document.getElementById('content').appendChild(div);
	},

	renderMoreButton: function(){
		var div = document.createElement('div');
		div.id = 'moreButton';
		div.className = 'hidden';
		div.innerHTML = '<a href="#">More</a>';
		document.getElementById('app').appendChild(div);
		document.getElementById("moreButton").addEventListener("click", controllers.loadMoreStories);
	},

	renderComments: function(array){
		for (var k=0; k < array.length; k++){
			if(array[k] instanceof Array){ //array
				this.renderComments(array[k]);
			} else { //object
				this.renderComment(array[k]);
			}
		}
	},

	renderComment: function(obj){
		if(!obj) return;
		var div = document.createElement('div');
    	div.className = 'commentContainer';
    	div.id = obj.id;
	    div.innerHTML = '<div class="spacerContainer"><div class="spacer" style="width:'+ (this.defaultSpaceWidth * obj.level) +'px"></div></div>'
	    			  + '<div class="arrowContainer"><div class="arrow"></div></div>'
	    			  + '<div class="commentContent"><span class="metaLine"><div class="commentUser">' + obj.by + '</div>'
	    			  + '<a class="toggle" data-chain="' + obj.chainLength + '"data-id="' + obj.id + '"href="#">[-]</a></span>'
	    			  + '<div class="commentText">' + obj.text + '</div>'
	    			  + '</div></div>';

	    var toggle = div.querySelector('.toggle');

	    toggle.addEventListener('click',controllers.toggleCollapse);
	    toggle.toggleElement = toggle;
	    toggle.chainLength = obj.chainLength;

     	document.getElementById('content').appendChild(div);
	}
}

var controllers = {

	loadLandingPage: function(){
		var self = this;
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
				views.renderTopStory(i+1,resp[i],page.LANDING);
			}

			// spinning icon related
			document.getElementById('alignBox').classList.add('hidden');
			document.getElementById('content').classList.remove('hidden');
			document.getElementById('content').classList.add('active');

		    document.getElementById('moreButton').classList.remove('hidden');

		});
	},

	loadStoryPage: function(i,id){
		var existingStories = models.stories[i];

		views.renderTopStory('',existingStories,page.STORY);

		models.getComments(i,existingStories).then(function(array){
			views.renderComments(array);
			document.getElementById('alignBox').classList.add('hidden');
		});
	},

	loadMoreStories: function(e){
		e.preventDefault();

		for (var i = 30 * models.loaded; i < 30 * (models.loaded+1); i++){
			views.renderTopStory(i+1,models.stories[i],page.LANDING);
		}
		models.loaded++;
	},

	goToStoryPage: function(e){
		e.preventDefault();
		var id = e.currentTarget.getAttribute("data-id");
		var i = e.currentTarget.getAttribute("data-index");
		
		window.history.pushState( { 
		    story_id: id, 
		  }, null, "/story/"+id);

		controllers.resetData(page.STORY);
		controllers.loadStoryPage(i,id);
		window.scrollTo(0, 0);
	},
	
	toggleCollapse:function(e){
		e.preventDefault();
		var toggle = e.target.toggleElement;
		var chainLength = e.target.chainLength;
    	var id = e.currentTarget.getAttribute("data-id");
    	var commentsContainer = document.getElementById(id);

    	var commentText = e.currentTarget.parentElement.nextElementSibling;

		if(toggle.classList.contains('active')){
			commentText.classList.remove('hidden');
    	} else {
    		commentText.classList.add('hidden');
    	}

		for(var i=0; i< chainLength-1; i++){
			commentsContainer = commentsContainer.nextElementSibling;
			if(toggle.classList.contains('active')){
				commentsContainer.classList.remove('hidden');
			} else {
				commentsContainer.classList.add('hidden');
			}
		}

		toggle.classList.toggle('active');
	},

	resetData: function(nextPage){
		models.loaded = 0;
	
		if(nextPage == page.STORY){
			var storyLinks = document.getElementsByClassName('storyLink');
			Array.from(storyLinks).forEach(function(element) {
		      element.removeEventListener('click',self.goToStoryPage);
		    });
		} else {
			var toggleLinks = document.getElementsByClassName('toggle');
			Array.from(toggleLinks).forEach(function(element) {
				console.log('removed listener');
				element.removeEventListener('click',controllers.toggleCollapse);
				element = null;
		    });
		}

		document.getElementById('alignBox').classList.remove('hidden');
		document.getElementById('moreButton').classList.add('hidden');
		document.getElementById('content').innerHTML = "";
	}
};

var init = function(){
	views.renderMoreButton();
	controllers.loadLandingPage();
};

window.onpopstate = function (event) {
	controllers.resetData(page.LANDING);
  	controllers.loadLandingPage();
  	window.scrollTo(0, 0);
}

init();