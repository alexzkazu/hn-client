import './styles.scss';

var models = {
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
    	div.className = 'storyContainer';
	    div.innerHTML = '<div class="number">'+ i +'</div>'
	    			  + '<div class="storyTitle"><a href="'+ obj.url + '">' + obj.title + '</a></div>'
	    			  + '<div class="metaInfo">' + obj.descendants + ' Comments</div>';
     	document.getElementById('content').appendChild(div);
	}

}

var init = function(){

	//get model
	models.getTopStories().then(function(ids){

		var promises = [];
		for (var i=0;i<30;i++){
			promises.push(models.getTopStory(ids[i]));
		}
		return Promise.all(promises);
	})
	.then(function(resp){
	//render views
		for (var i=0;i<30;i++){
			views.renderTopStory(i+1,resp[i]);
		}
	});

};

init();