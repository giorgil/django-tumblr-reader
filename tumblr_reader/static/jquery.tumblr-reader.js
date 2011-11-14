/*******************************************************************************
* jquery.tumblr-reader.js
********************************************************************************
* Copyright (c) 2011 Zach Snow <z@zachsnow.com>
* 
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
* 
* The above copyright notice and this permission notice shall be included in
* all copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
* THE SOFTWARE.
*******************************************************************************/
/*******************************************************************************
* Description:
*
*   Tumblr Reader is a simple library aimed at easily embedding Tumblr
*   blogs.  It writes in simple, structured HTML that can be styled however you
*   like; the included jquery.tumblr-reader.css is a very simple set of
*   rules to get you started.  If the rendered HTML is not adequate for your
*   needs you can override how different post types and relevant post data
*   are rendered.
*
*   Tumblr Reader makes use of the Tumblr API version 1, and therefore shares
*   in that API's limitations.
*
*   It really doesn't depend too much on jQuery; in fact, it just uses $,
*   $.each, $.extend, and $.append.  So it should be pretty straightforward to
*   port to another JS library.
*
********************************************************************************
* Usage:
*
*   To load your blog (http://yourblog.tumblr.com in the following) into a
*   container having a particular id (in this case 'your-container-id'):
*
*   $.tumblrReader({
*       blog: 'yourblog',
*       container: 'your-container-id'    
*   });
*
*   This returns a jqXHR object, in case you want to add any callbacks (success,
*   complete, and so on).
*
*   Additional parameters:
*       `count`: the number of posts to retrieve.
*       `tagged`: retrieve only those posts that have this tag.
*
*   For more information, including details about changing how posts are
*   rendered, see:
*
*       http://bitbucket.org/zachsnow/django-tumblr-reader/
*
*******************************************************************************/
(function($){
    $.tumblrReader = function(options){
        options = $.extend($.tumblrReader.options, options);
        
        var container = options.container || 'body';
        var $container = $(container);
        
        var url = parse(templates.endpoint, options);
        return $.getJSON(url, function(blog){
            var posts = createPosts(blog.posts);
            var $posts = $('<div class="tumblr-reader-posts"></div>');
            
            $.each(posts, function(i, post){
                $posts.append(post);
            });
            
            $container.append($posts);
        });
    };
    
    $.tumblrReader.options = {
        count: 10,
        tagged: '',
    };
    
    // TODO: use a real template library!
    var parse = function(template, params){
        $.each(params, function(key, value){
            var re = new RegExp('\\$\\{\s*' + key + '\s*\\}', 'g'); 
            template = template.replace(re, value);
        });
        return $(template);
    };    
    
    var templates = {
        tags: '<div class="tumblr-reader-tags">${tags}</div>',
        date: '<div class="tumblr-reader-date"><a class="tumblr-reader-permalink" href="${url}">${date}</a></div>',
        endpoint: 'http://${blog}.tumblr.com/api/read/json?num=${count}&tagged=${tagged}&callback=?'
    };
    
    $.tumblrReader.parsers = {};
    var parsers = $.tumblrReader.parsers;
    
    $.tumblrReader.parsers.regular = function(post){
        var template = '';
        template += '<div class="tumblr-reader-post tumblr-reader-post-regular">';
        template += templates.date;
        template += templates.tags;
        template += '<div class="tumblr-reader-title">${title}</div>';
        template += '<div class="tumblr-reader-body">${body}</div>';
        template += '</div>'
        
        var params = {
            title: post['regular-title'],
            body: post['regular-body'],
            tags: parsers.tags(post),
            date: parsers.date(post),
            url: post['url-with-slug'],
        };
        
        return parse(template, params);
    };
    
    $.tumblrReader.parsers.photo = function(post){
        var template = '';
        template += '<div class="tumblr-reader-post tumblr-reader-post-photo">';
        template += templates.date;
        template += templates.tags;
        template += '<div class="tumblr-reader-photo"><img src="${photo}" /></div>';
        template += '<div class="tumblr-reader-caption">${caption}</div>';
        template += '</div>'
        
        var params = {
            caption: post['photo-caption'],
            photo: post['photo-url-1280'],
            tags: parsers.tags(post),
            date: parsers.date(post),
            url: post['url-with-slug'],
        };
        
        return parse(template, params);
    };
    
    $.tumblrReader.parsers.quote = function(post){
        var template = '';
        template += '<div class="tumblr-reader-post tumblr-reader-post-quote">';
        template += templates.date;
        template += templates.tags;
        template += '<div class="tumblr-reader-quote">${quote}</div>';
        template += '<div class="tumblr-reader-source">${source}</div>';
        template += '</div>'
        
        var params = {
            quote: post['quote-text'],
            source: post['quote-source'],
            tags: parsers.tags(post),
            date: parsers.date(post),
            url: post['url-with-slug'],
        };
        
        return parse(template, params);
    };
    
    $.tumblrReader.parsers.link = function(post){
        var template = '';
        template += '<div class="tumblr-reader-post tumblr-reader-post-link">';
        template += templates.date;
        template += templates.tags;
        template += '<div class="tumblr-reader-link"><a href="${url}">${text}</a></div>';
        template += '</div>'
        
        var params = {
            text: post['link-text'],
            linkUrl: post['link-url'],
            tags: parsers.tags(post),
            date: parsers.date(post),
            permalink: post['url-with-slug'],
        };
        
        return parse(template, params);
    };
    
    $.tumblrReader.parsers.date = function(post){
        var timestamp = post['unix-timestamp'];
        var date = new Date(parseInt(timestamp, 10) * 1000);
        var month = date.getMonth() + 1;
        var day = date.getDay() + 1;
        var year = date.getFullYear();
        return month + '/' + day + '/' + year;
    };
    
    $.tumblrReader.parsers.tags = function(post){
        var tags = post['tags'];
        $.each(tags, function(i, tag){
            tags[i] = '#' + tag;
        });
        return tags.join(', ')
    }
    
    var createPost = function(post){
        var create = parsers[post.type];
        if(!create){
            // TODO: this is an unsupported post type, should it get reported?
            return;
        }
        return create(post);
    };
    
    var createPosts = function(posts){
        var $posts = [];
        $.each(posts, function(i, post){
            var $post = createPost(post);
            if($post){
                $posts.push($post);
            }
        });
        return $posts;
    };
})(jQuery);
