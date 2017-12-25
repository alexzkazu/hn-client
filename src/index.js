import './styles.scss';

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

	renderTopStory: function(i,obj){
		var div = document.createElement('div');
    	div.className = 'storyContainer';
	    div.innerHTML = '<div class="number">'+ i +'.</div>'
	    			  + '<div class="storyBox">'
	    			  + '<div class="storyTitle"><a href="'+ obj.url + '">' + obj.title + '</a></div>'
	    			  + '<div class="metaInfo">'+ obj.score + ' points | <a class="storyLink" data-index= "'+(i-1)+'" data-id="'+ obj.id + '" href="#">' + obj.descendants + ' comments</a></div>'
	    			  + '</div>';
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
	    			  + '<a class="toggle" data-id="' + obj.id + '"href="javascript:void(0)">[-]</a></span>'
	    			  + '<div class="commentText">' + obj.text + '</div>'
	    			  + '</div></div>';
     	document.getElementById('content').appendChild(div);
     	//add event listener for collapse button
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
				views.renderTopStory(i+1,resp[i]);
			}

			// spinning icon related
			document.getElementById('alignBox').classList.add('hidden');
			document.getElementById('content').classList.remove('hidden');
			document.getElementById('content').classList.add('active');

			// add listeners on each story link
			var storyLinks = document.getElementsByClassName('storyLink');
			Array.from(storyLinks).forEach(function(element) {
		      element.addEventListener('click',self.goToStoryPage);
		    });

		    document.getElementById('moreButton').classList.remove('hidden');

		});
	},

	loadStoryPage: function(i,id){
		//clear the contents
		controllers.resetData();
		var existingStories = models.stories[i];


		views.renderTopStory('',existingStories);

		models.getComments(i,existingStories).then(function(array){
			console.log(array);
			views.renderComments(array);

			document.getElementById('alignBox').classList.add('hidden');

			//get all the comments here and turn it into an array that can be rendered

		});
	},

	loadMoreStories: function(e){
		e.preventDefault();

		for (var i = 30 * models.loaded; i < 30 * (models.loaded+1); i++){
			views.renderTopStory(i+1,models.stories[i]);
		}
		models.loaded++;
	},

	goToStoryPage: function(e){
		e.preventDefault();
		var id = this.getAttribute("data-id");
		var i = this.getAttribute("data-index");
		
		window.history.pushState( { 
		    story_id: id, 
		  }, null, "/story/"+id);

		controllers.loadStoryPage(i,id);
	},
	resetData: function(page){
		models.loaded = 0;
		document.getElementById('alignBox').classList.remove('hidden');
		document.getElementById('moreButton').classList.add('hidden');
		document.getElementById('content').innerHTML = "";
	}
};

var init = function(){
	//if landing page
	views.renderMoreButton();
	controllers.loadLandingPage();
	//check
	// controllers.createCommentPage();
};

window.onpopstate = function (event) {
	controllers.resetData();
  	controllers.loadLandingPage();
}

init();