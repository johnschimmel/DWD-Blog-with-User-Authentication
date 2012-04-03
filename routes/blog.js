/**
  * Module dependencies.
  */
var db = require('../accessDB');

// db.BlogPost

module.exports = {

    mainpage : function(request, response) {

        // build the query
        var query = db.BlogPost.find({});
        query.populate('author');
        query.sort('date',-1); //sort by date in descending order

        // run the query and display blog_main.html template if successful
        query.exec({}, function(err, allPosts){
            
            // prepare template data
            templateData = {
                posts : allPosts
            };

            // render the card_form template with the data above
            response.render('blog/blog_main.html', templateData);

        });

    },
    
    recent : function(request, response){

        // create date variable for 7 days ago
        var lastWeek = new Date();
        lastWeek.setDate(-7);

        // query for all blog posts where the date is greater than or equal to 7 days ago
        var query = db.BlogPost.find({ date : { $gte: lastWeek }});
        query.populate('author');
        query.sort('date',-1);
        query.exec(function (err, recentPosts) {


          // prepare template data
          templateData = {
              posts : recentPosts
          };

          // render the card_form template with the data above
          response.render('blog/recent_posts.html', templateData);

        });

    },
    
    getSingleEntry : function(request, response){
        // Get the request blog post by urlslug
        db.BlogPost.findOne({ urlslug : request.params.urlslug }).populate('author').run(function(err, blogpost){

            if (err) {
                console.log(err);
                response.send("an error occurred!");
            }

            if (blogpost == null ) {
                console.log('post not found');
                response.send("uh oh, can't find that post");

            } else {

                // use different layout for single entry view
                blogpost.layout = 'layout_single_entry.html';

                // found the blogpost
                response.render('blog/blog_single_entry.html', blogpost);
            }
        });
    },
    
    getSingleEntryById : function(request, response) {

        var requestedPostID = request.params.postId;

        db.BlogPost.findById( requestedPostID, function(err, blogpost) {

            if (err) {
                console.log(err);
                response.send("an error occurred!");
            }

            if (blogpost == null ) {
                console.log('post not found');
                response.send("uh oh, can't find that post");

            } else {

                // use different layout for single entry view
                blogpost.layout = 'layout_single_entry.html';

                // found the blogpost
                response.render('blog/blog_single_entry.html', blogpost);
            }

        })

    },
    
    // post /comment
    postComment : function(request, response){

        // get the comment form's hidden value - urlslug
        var urlslug = request.body.urlslug;

        // Query for the blog post with matching urlslug
        db.BlogPost.findOne({urlslug:urlslug}, function(err,post){
            // if there was an error...
            if (err) {
                console.log('There was an error');
                console.log(err);

                // display message to user
                response.send("uh oh, can't find that post"); 
            }

            // Prepare, save and redirect

            // prepare new comment for blog post with the form data
            var commentData = {
                name : request.body.name,
                text : request.body.text
            };

            // create new comment
            var comment = new db.Comment(commentData);

            // append the comment to the comment list
            post.comments.push(comment);
            post.save();

            if (request.xhr) {

                response.json({
                    status :'OK',
                    comment : {
                        name : commentData.name,
                        text : commentData.text
                    }
                });

            } else {

                // redirect to the blog entry
                response.redirect('/entry/' + urlslug);

            }

        });

    },
    
    //display new entry form /new-entry
    getNewEntry : function(request, response){
        //display the blog post entry form
        templateData = {
            currentUser : request.user
        }
        
        response.render('blog/blog_post_entry_form.html', templateData);
    },
    
    // receive form POST for new entry /new-entry
    postNewEntry : function(request, response){

        console.log('Received new blog post submission');
        console.log(request.body);

        // Prepare the blog post entry form into a data object
        var blogPostData = {
            title : request.body.title,
            urlslug : request.body.urlslug,
            content : request.body.content,
            author : request.user._id
        };

        // create a new blog post
        var post = new db.BlogPost(blogPostData);

        // save the blog post
        post.save();

        // redirect to show the single post
        response.redirect('/entry/' + blogPostData.urlslug); // for example /entry/this-is-a-post

    },
  
    
    getEntryUpdate :function(request, response){
        // get the request blog post id
        var requestedPostID = request.params.postId;

        // find the requested document
        db.BlogPost.findById( requestedPostID, function(err, blogpost) {

            if (err) {
                console.log(err);
                response.send("an error occurred!");
            }

            if (blogpost == null ) {
                console.log('post not found');
                response.send("uh oh, can't find that post");

            } else {

                // prepare template data
                // blogpost data & updated (was this entry updated ?update=true)
                templateData = {
                    blogpost : blogpost,
                    updated : request.query.update
                };

                // found the blogpost
                response.render('blog/blog_post_entry_update.html', templateData);
            }

        })

    },
    
    postEntryUpdate : function(request, response){
        
        // update post body should have form element called blog_post_id
        var postid = request.body.blog_post_id;

        // get the blog post with populated author information
        db.BlogPost.findOne({ _id : postid }).populate('author').run(function(err, blogpost){

            if (blogpost.author._id.toString() != request.user._id.toString()) {
                
                noAccessStr = "Sorry you are not allowed to edit this document<br> \
                " + blogpost.author._id + " == " + request.user._id;
                
                response.send(noAccessStr);
                
            } else {
                console.log("User is allowed to edit this document");
                console.log(blogpost.author._id + " == " + request.user._id);
            }

            
            // we are looking for the BlogPost document where _id == postid
            var condition = { _id : postid };

            // update these fields with new values
            var updatedData = {
                title : request.body.title,
                content : request.body.content
            };

            // we only want to update a single document
            var options = { multi : false };

            // Perform the document update
            // find the document with 'condition'
            // include data to update with 'updatedData'
            // extra options - this time we only want a single doc to update
            // after updating run the callback function - return err and numAffected

            db.BlogPost.update( condition, updatedData, options, function(err, numAffected){

                if (err) {
                    console.log('Update Error Occurred');
                    response.send('Update Error Occurred ' + err);

                } else {

                    console.log("update succeeded");
                    console.log(numAffected + " document(s) updated");

                    //redirect the user to the update page - append ?update=true to URL
                    response.redirect('/update/' + postid + "?update=true");

                }
            });
            
        })
        


    },
    
    apiAllPosts : function(request, response){

        // define the fields you want to include in your json data
        includeFields = ['title','content','urlslug','date','comments','author.name']

        // query for all blog
        queryConditions = {}; //empty conditions - return everything
        var query = db.BlogPost.find( queryConditions, includeFields);

        query.sort('date',-1); //sort by most recent
        query.exec(function (err, blogPosts) {

            // render the card_form template with the data above
            jsonData = {
              'status' : 'OK',
              'posts' : blogPosts
            }

            response.json(jsonData);
        });
    },
    
    jsontest : function(request, response) {

        // define the remote JSON feed
        blogPostsURL= "http://dwd-mongodb.herokuapp.com/data/allposts"; //pretend this url is actually on another server

        // make the request
        requestURL(blogPostsURL, function(error, httpResponse, data) {
            //if there is an error
            if (error) {
                console.error(error);
                response.send("uhoh there was an error");
            }

            // if successful HTTP 200 response
            if (httpResponse.statusCode == 200) {

                //convert JSON into native javascript
                blogPostData = JSON.parse(data);

                if (blogPostData.status == "OK") {
                    posts = blogPostData.posts;

                    //render template with remote data
                    templateData = {
                        blogposts : posts, 
                        source_url : blogPostsURL   
                    }
                    response.render("blog/remote_json_example.html",templateData)
                } else {

                    response.send("blog post JSON status != OK");
                }
            }
        }); // end of requestURL callback
    },
    
    ajaxExample :  function(request, response){

        // use the layout --> layout_ajax.html, includes the ajax_example.js script
        templateData = {
            layout:'layout_ajax.html'
        };

        //render the template 
        response.render("blog/ajax_example.html", templateData);

    },
    
    jsonExample : function(request, response){

        // use the layout --> layout_ajax.html, includes the ajax_example.js script
        templateData = {
            layout:'layout_ajax.html'
        };

        //render the template 
        response.render("blog/ajax_jsonp_example.html", templateData);

    },
    
    weatherRedirect :function(request, response){

        // default /weather request - redirect to /weather/NYC
        response.redirect("/weather/nyc");

    }, 
    
    weatherMain : function(request, response){

        // Yahoo Where On Earth ID ( WOEID )
        // look up more locations here http://woeid.rosselliot.co.nz/lookup/shanghai
        YAHOOLocations = {
            'nyc' : 2459115,
            'berlin' : 638242,
            'shanghai' : 2151849
        }

        // convert incoming location parameter to lowercase
        requestedLocation = request.params.location.toLowerCase();

        // lookup the location in YAHOOLocations
        if (requestedLocation in YAHOOLocations ) {
            woeid = YAHOOLocations[requestedLocation];
        } else {
            woeid = YAHOOLocations['nyc'] // default to nyc
        }

        // build the request URL
        yahooWeatherURL = "http://weather.yahooapis.com/forecastjson?w=" + woeid;

        // make the request
        requestURL(yahooWeatherURL, function(err, httpResponse, data) {

            if (err || httpResponse.statusCode != 200) {
                console.log(err);
                response.send("Something went wrong");
            }

            if (httpResponse.statusCode == 200) {

                //convert JSON string into JS Object
                weatherData = JSON.parse(data);

                console.log("-------- DATA RECEIVED -------");
                console.log(data);
                console.log("------------------------------");

                templateData = {
                    jsonFromYahoo : data,
                    weather : weatherData,
                    requestedURL : yahooWeatherURL, 
                    YAHOOLocations : YAHOOLocations
                }

                response.render('blog/weather_from_yahoo.html', templateData);
            }


        })

    }

}