'use strict';

const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const sassGlob = require('gulp-sass-glob');
const autoprefixer = require('gulp-autoprefixer');
const uglify = require('gulp-uglify');
const uglifycss = require('gulp-uglifycss');
const addsrc = require('gulp-add-src');
const order = require('gulp-order');
const concat = require('gulp-concat');
const concatCss = require('gulp-concat-css');

const gulpSass = () => {
  return gulp.src([
    './public/assets/stylesheets/*.scss',
    'node_modules/polipop/dist/css/polipop.core.min.css',
    'node_modules/polipop/dist/css/polipop.default.min.css'
  ])
    .pipe(sassGlob())
    .pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer())
    .pipe(concatCss('application.css'))
    .pipe(uglifycss())
    .pipe(gulp.dest('./public/assets/stylesheets/'));
};

const gulpJs = () => {
  return gulp.src('public/assets/javascripts/application/*.js')
    .pipe(addsrc('node_modules/jquery/dist/jquery.min.js'))
    .pipe(addsrc('node_modules/axios-auto/dist/browser/index.js'))
    .pipe(addsrc('node_modules/polipop/dist/polipop.min.js'))
    .pipe(addsrc('node_modules/bignumber.js/bignumber.js'))
    .pipe(addsrc('node_modules/web3/dist/web3.min.js'))
    .pipe(order([
      'node_modules/jquery/dist/jquery.min.js',
      'node_modules/polipop/dist/polipop.min.js',
      'node_modules/bignumber.js/bignumber.js',
      'node_modules/web3/dist/web3.min.js',
      'public/assets/javascripts/application/*.js'
    ], {base: '.'}))
    .pipe(concat('application.js'))
    .pipe(uglify())
    .pipe(gulp.dest('public/assets/javascripts'));
};

const gulpWatch = () => {
  return gulp.watch(['./public/assets/stylesheets/**/**/*.scss', './public/assets/javascripts/application/*.js'], gulp.parallel(gulpSass, gulpJs));
};

module.exports = {
  default: gulp.parallel(gulpSass, gulpJs),
  sass: gulpSass,
  javascript: gulpJs,
  watch: gulpWatch
};
