//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const session=require('express-session')
const passportLocalMongoose=require('passport-local-mongoose');
const passport = require("passport");
require('dotenv').config()
const path=require('path');
const multer=require('multer')
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const methodOverride=require('method-override')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')


const homeStartingContent = "Make stuff, look at stuff, talk about stuff. Create a unique and beautiful blog.Its easy and free.";
const aboutContent = "Hello everyone!! ";
const contactContent = "For further queries, you can contact us directly. We will come back to you within matter of hours to help you.";
var registerError=[];
var loginError=[];

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(methodOverride('_method'))

app.use(session({
  secret:'My project secret.',
  resave:false,
  saveUninitialized:false,
}))

app.use(passport.initialize())
app.use(passport.session())

mongoose.connect("mongodb+srv://admin-pranav:Pranav2918@cluster0.dp2jj.mongodb.net/BlogWebsiteDB", {useNewUrlParser: true,useUnifiedTopology: true});
mongoose.set('useCreateIndex', true)
mongoose.set('useFindAndModify', false)

const userSchema=new mongoose.Schema({
  email:String,
  name:String,
  password:String,
  googleId:String,
  facebookId:String
  }
);

const postSchema={
  title:String,
  content:String,
  user:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'User'
  },
  publishedAt:Date,
  images:[
    {
      url:String,
      filename:String
    }
  ],
}

const contactSchema=new mongoose.Schema({
  name:String,
  email:String,
  subject:String,
  message:String
})

const reviewSchema=new mongoose.Schema({
  name:String,  
  review:String,
  post:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'Post'
  },
  time:Date
})

userSchema.plugin(passportLocalMongoose)
userSchema.plugin(findOrCreate)

const User= mongoose.model('User',userSchema);

const Post=mongoose.model('Post',postSchema) 

const Contact=mongoose.model('Contact',contactSchema);

const Review=mongoose.model('Review',reviewSchema)


passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

cloudinary.config({
  cloud_name:process.env.CLOUDINARY_NAME,
  api_key:process.env.CLOUDINARY_KEY,
  api_secret:process.env.CLOUDINARY_SECRET
})

const storage=new CloudinaryStorage({
  cloudinary,
  params:{
  folder:'Blog',
  allowedFormats:['jpeg','png','jpg']
  }
})

const upload = multer({ storage})

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/blogWebsite",
  userProfileURL:'https://www.googleapis.com/oauth2/v3/userinfo'
},
function(accessToken, refreshToken, profile, cb) {
  
  User.findOrCreate({ googleId: profile.id,username:profile.provider+profile.id}, function (err, user) {
    return cb(err, user);
  });
}
));


app.get("/", function(req, res){

  Post.find({},function(err,posts){
    if(err){
      console.log(err)
    }
    else{
      if(posts){
        res.render('home',{
          startingContent:homeStartingContent,
          posts:posts
        })
      }
    }
  })
});

app.get('/auth/google',
passport.authenticate('google',{scope:['profile','email']})

);

app.get('/auth/google/blogWebsite', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
   
    res.redirect('/compose');
  });

app.get("/about", function(req, res){
  res.render("about", {aboutContent: aboutContent});
});

app.get("/contact", function(req, res){
  res.render("contact", {contactContent: contactContent});
});

app.get('/regLog',function(req,res){
  res.render('regLog')
})
app.get('/register',function(req,res){
  res.render('register',{message:registerError})
  registerError=[]
})

app.get('/login',function(req,res){
  res.render('login',{message:loginError})
  loginError=[]
})

app.get("/posts/:postId", function(req, res){

  const requestedPostId = req.params.postId;
    Post.findOne({_id: requestedPostId}, function(err, post){
      if(err){
        console.log(err)
      }
      else{
        if(post){
          res.render("post", {
            title: post.title,
            content: post.content,
            publishedAt:post.publishedAt,
            images:post.images
          });

        }
      }
      });
  });

app.get("/myblogs/:postId", function(req, res){

    const requestedPostId = req.params.postId;
      Post.findOne({_id: requestedPostId}, function(err, post){
        res.render("blog", {
          title: post.title,
          content: post.content,
          publishedAt:post.publishedAt,
          id:requestedPostId,
          images:post.images

        });
      });
    });

app.get('/myblogs/:blogId/edit',upload.array('blogimage'),function(req,res){
      Post.findById({_id:req.params.blogId},function(err,foundBlog){
        if(err){
          console.log(err)
        }
        else{
          if(foundBlog){
          res.render('edit',{blog:foundBlog})
          }
        }
      })

    })

app.get('/myblogs/:blogID/delete',function(req,res){
      const deletedPostID = req.params.blogID;
    Post.deleteOne({ _id: deletedPostID }, function (err) {
  if (!err) {
    res.redirect("/myblogs");
  }
});
      
    })

app.get('/compose',function(req,res){
      if(req.isAuthenticated()){
        res.render('compose')
      }
      else{
        res.redirect('/login')
      }
    })

app.get('/myBlogs',function(req,res){
  
      Post.find({user:req.user._id},function(err,currentUser){
        if(err){
          console.log(err);
          res.redirect('/compose')
        }
        else{
          if(currentUser){
            res.render('userblogs',{myblogs:currentUser})
          }
        }
      })
    })

app.get('/logout',function(req,res){
      req.logout()
      res.redirect('/')
    })


app.put('/myblogs/:blogId',upload.array('blogimage'),function(req,res){
      const imgs=req.files.map(f =>({
        url:f.path,
        filename:f.filename
      }))
      
      const newBlog=Post.findOneAndUpdate({_id:req.params.blogId},{title:req.body.postTitle,content:req.body.postBody},function(err,newBlog){
        if(!err){
          newBlog.images.push(...imgs)  
          newBlog.save() 
        }  
      })
      res.redirect('/')
    })

app.post("/delete", function (req, res) {
      const deletedPostID = req.body.deletedPost;
      Post.deleteOne({ _id: deletedPostID }, function (err) {
        if (!err) {
          res.redirect("/myblogs");
        }
      });
    });

app.post('/edit',function(req,res){
      const updatePostID=req.body.updatedPost

      Post.findById({_id:updatePostID},function(err,foundBlog){
        if(err){
          console.log(err)
        }
        else{
          if(foundBlog){
          res.render('edit',{blog:foundBlog})
          }
        }
      })
    })

   
  app.post('/publish',upload.array('blogimage'),function(req,res){
    const submittedTitle=req.body.postTitle
    const submittedContent=req.body.postBody

    var today = new Date();
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    var dateTime = date+' '+time;

    console.log(req.files)

    newPost=new Post({
      title:submittedTitle,
      content:submittedContent,
      user:req.user._id,
      publishedAt:dateTime,
      images:req.files.map(f =>({
        url:f.path,
        filename:f.filename
      }))
      
    })
    
    newPost.save(function(err,newpost){
      if(err){
        console.log(err);
      }
      else{
        res.redirect('/')
            }
          })
    })

app.post('/register',function(req,res){
    const pass=req.body.password

    User.register({username:req.body.username,name:req.body.fullName},req.body.password,function(err,user){
      if(err){
        registerError.push(' * A user with given username is already registered!')
        res.redirect('/register')
      }
      else{
        registerError=[]
        passport.authenticate('local')(req,res,function(){ 
              res.redirect('/compose')
          })
          
      }
    })
  })
  
app.post('/login',function(req,res){
    const user=new User({
     username:req.body.username,
     password:req.body.password
    })

    User.findOne({username:req.body.username},function(err,fuser){
      if(err){
        console.log(err)
      }
      if(!fuser){
        loginError.push("* Sorry,we couldn't find a account with that username.")
        res.redirect('/login')
      }
      else{
        loginError=[]
    req.login(user,function(err){
      if(err){
        res.redirect('/login')
      }
      else{
        passport.authenticate('local',{ failureRedirect: '/login' })(req,res,function(){
          res.redirect('/compose')
        })
      }
    })
  }
  })

});

app.post('/contact',function(req,res){

  const newContact=new Contact({
    name:req.body.name,
    email:req.body.email,
    subject:req.body.subject,
    message:req.body.message
  })

  newContact.save(function(err){
    if(err){
      console.log(err)
    }
    else{
      res.redirect('/')
    }
  })
})

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}


app.listen(port, function() {
  console.log("Server started on port 3000");
});
