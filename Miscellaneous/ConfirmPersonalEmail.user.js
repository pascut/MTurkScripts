// ==UserScript==
// @name         ConfirmPersonalEmail
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  ConfirmPersonalEmail for Bing
// @author       You
// @include        http://*.mturkcontent.com/*
// @include        https://*.mturkcontent.com/*
// @include        http://*.amazonaws.com/*
// @include        https://*.amazonaws.com/*
// @include https://worker.mturk.com/*
// @include http://mailtester.com*
// @include file://*
// @grant GM_deleteValue
// @grant  GM_getValue
// @grant GM_setValue
// @grant GM_cookie
// @grant GM_addValueChangeListener
// @grant GM_setClipboard
// @grant GM_xmlhttpRequest
// @grant GM_openInTab
// @grant GM_getResourceText
// @grant GM_addStyle
// @connect google.com
// @connect bing.com
// @connect yellowpages.com
// @connect *
// @require https://raw.githubusercontent.com/hassansin/parse-address/master/parse-address.min.js
// @require https://raw.githubusercontent.com/jacobmas/MTurkScripts/f029f945a2dfc0df7d6d5bd2e18c614c05fbd84a/js/MTurkScript.js
// @resource GlobalCSS https://raw.githubusercontent.com/jacobmas/MTurkScripts/master/global/globalcss.css
// @require https://raw.githubusercontent.com/jacobmas/MTurkScripts/964d4a14ccc75d6413338c867172e8e5bd6cf9ea/Govt/Government.js
// @require https://raw.githubusercontent.com/spencermountain/compromise/master/builds/compromise.min.js

// ==/UserScript==

(function() {
    'use strict';
    var my_query = {};
    var bad_urls=["/app.lead411.com",".zoominfo.com",".privateschoolreview.com",".facebook.com",".niche.com","en.wikipedia.org",".yelp.com","hunter.io",
                 ".zoominfo.com","issuu.com","linkedin.com","downloademail.info","www.skymem.com","/ufind.name",".lead411.com","beenverified.com",
                 "email-format.com","scribd.com","/lusha.co","patents.justia.com"];
    var MTurk=new MTurkScript(60000,500,[],begin_script,"A1FS8KQVU1SUKC",true);
    var MTP=MTurkScript.prototype;
    var my_email_re = /(([^<>()\[\]\\.,;:\s@"：+=\/\?%\*]{1,40}(\.[^<>\/()\[\]\\.,;:：\s\*@"\?]{1,40}){0,5}))@((([a-zA-Z\-0-9]{1,30}\.){1,8}[a-zA-Z]{2,20}))/g;

    function is_bad_name(b_name)  { return false; }

    function is_good_name_domain(b_name) {
        let short_company=MTP.shorten_company_name(my_query.company);
        b_name=b_name.replace(/University of /,"");
        return b_name.toLowerCase().indexOf(short_company.split(" ")[0].toLowerCase())!==-1||
            my_query.company.toLowerCase().indexOf(b_name.split(" ")[0].toLowerCase())!==-1;
    }

    function matches_person_names(name1,name2) {
        return (name1.fname===name2.fname && name1.lname.indexOf(name2.lname)!==-1);
    }

    function gov_promise_then(result) {
       console.log("Gov result="+JSON.stringify(Gov.contact_list));
        var x;
        for(x of Gov.email_list) if(!my_query.email_list.includes(x)) my_query.email_list.push(new EmailQual(x.email,x.url));
    }


    /* Parse query of person */
    function query_response_query(b_name,b_url,p_caption,i,promise_list) {
        var short_name=b_name.replace(/\s[\-\|\,]+.*$/,"").replace(/,.*$/,"").trim();
        var full_short=MTP.parse_name(short_name);
        var relationshipscience_re=/^([^,]),.*\sat\s(.*)$/,match;
        if(i < 4&&!MTP.is_bad_url(b_url,bad_urls,-1) && !/\.(xls|xlsx|pdf|doc)$/.test(b_url))  {
            var dept_regex_lst=[];
            var title_regex_lst=[/Admin|Administrator|Supervisor|Professor|Manager|Director|Founder|Owner|Officer|Secretary|Assistant/i];
            //var promise=MTP.create_promise(
            var query={dept_regex_lst:dept_regex_lst,
                       title_regex_lst:title_regex_lst,id_only:false,default_scrape:false,debug:false};
          //promise_list.push(MTP.create_promise(b_url,Gov.init_Gov,gov_promise_then,MTP.my_catch_func,query));


            promise_list.push(MTP.create_promise(b_url,contact_response,MTP.my_then_func,MTP.my_catch_func));
        }
        // copied from FindPeople/Ryan.user.js 06/10/2019, modified slightly
        if(i<=1 && /linkedin\.com\/in/.test(b_url) &&
           (matches_person_names(full_short,my_query.fullname) ||
            (b_url.indexOf(my_query.fullname.fname.toLowerCase())!==-1 && b_url.indexOf(my_query.fullname.lname.toLowerCase())!==-1))
           && !my_query.redone_linkedin) {
            console.log("MATCHED short_name, my_query.name for linkedin");
            my_query.redone_linkedin=true;
            let b_split=b_name.replace(/[\-\|]\s*LinkedIn$/i,"").split(/\s+[\-\|]\s+/);
            if(b_split.length>=3 && !/\.\.\.\s*$/.test(b_split)) my_query.company=b_split[2].replace(/\.\.\.\s*$/,"");
            else if(b_split.length>=3) my_query.alt_companies.push(b_split[2].replace(/\.\.\.\s*$/,""));
        }
        if(/relationshipscience\.com/.test(b_url) && matches_person_names(full_short,my_query.fullname) &&
           (match=b_name.match(relationshipscience_re))) {
            my_query.alt_companies.push(match[2].replace(/\.\.\.\s*$/,""));
        }
    }

    /* Parse a single bing search result on a page */
    function query_response_loop(b_algo,i,type,promise_list,resolve,reject,b1_success) {
        var b_name,b_url,p_caption,b_caption;
        var pos=parseInt(type.replace(/query/,""));
        var mtch,j,people;
        b_name=b_algo[i].getElementsByTagName("a")[0].textContent;
        b_url=b_algo[i].getElementsByTagName("a")[0].href;
        b_caption=b_algo[i].getElementsByClassName("b_caption");
        p_caption=(b_caption.length>0 && b_caption[0].getElementsByTagName("p").length>0) ?
            p_caption=b_caption[0].getElementsByTagName("p")[0].innerText : '';

        if(!/^(emailformat)$/.test(type)) console.log("("+i+"), b_name="+b_name+", b_url="+b_url+", p_caption="+p_caption);
        if(/query/.test(type) && (mtch=p_caption.match(my_email_re))) {
            for(j=0; j < mtch.length; j++) {
                console.log("mtch["+j+"]="+mtch[j]+", emails_to_check="+JSON.stringify(my_query.emails_to_check));
                if(mtch[j].toLowerCase()===my_query.emails_to_check[pos]) setEmailType(pos,0);
            }
        }
        /* TODO: integrate PDF parser at some point */
        if(/^query/.test(type) && i <=4 && !/\.(xls|xlsx|pdf|doc)$/.test(b_url)&&!MTP.is_bad_url(b_url,bad_urls,-1)) {
           promise_list.push(MTP.create_promise(b_url,contact_response,MTP.my_then_func,MTP.my_catch_func,pos));
        }
        // Parse the query pages where person and company are searched for
        if(type==="query") query_response_query(b_name,b_url,p_caption,i,promise_list);

        if(type==="url" && !MTP.is_bad_url(b_url, bad_urls,4,2) && !is_bad_name(b_name) && (b1_success=true)) return b_url;
        return null;
    }

    function query_response(response,resolve,reject,type) {
        var doc = new DOMParser().parseFromString(response.responseText, "text/html");
        console.log("in query_response\n"+response.finalUrl+", type="+type+", try_count["+type+"]="+my_query.try_count[type]);
        var search, b_algo, i=0, inner_a,result;
        var b_url, b_name, b_factrow,lgb_info, b_caption,p_caption,loop_result;
        var b1_success=false, b_header_search,b_context,parsed_context,parsed_lgb,parsed_loc;
        var promise_list=[];
        try {
            search=doc.getElementById("b_content");
            b_algo=search.getElementsByClassName("b_algo");
            if((b_context=doc.getElementById("b_context"))&&(parsed_context=MTP.parse_b_context(b_context))) {

            }
            if((lgb_info=doc.getElementById("lgb_info"))&&
               (parsed_lgb=MTP.parse_lgb_info(lgb_info))) console.log("parsed_lgb="+JSON.stringify(parsed_lgb));
            for(i=0; i < b_algo.length&&i<5; i++) {
                b_url=query_response_loop(b_algo,i,type,promise_list,resolve,reject,b1_success);
                if(b_url&&(b1_success=true)) break;
            }
            if(/^(rocket|emailformat)$/.test(type) && (resolve("")||true)) return;
            if(type==="email") {
                my_query.totalEmail++;
                Promise.all(promise_list).then(function() {
                    my_query.doneEmail++;
                    done_email_promises_then({type:type,resolve:resolve,reject:reject}); })
                    .catch(function() {
                    my_query.doneEmail++;
                    done_email_promises_then({type:type,resolve:resolve,reject:reject}) });
                return; }
            if(b1_success && (resolve(b_url)||true)) return;
            if(type==="query") {
                Promise.all(promise_list).then(done_query_promises_then).catch(done_query_promises_then);
                resolve("");
                return;
            }
            if(type==="url" && parsed_lgb&&parsed_lgb.url && !MTP.is_bad_url(parsed_lgb.url,bad_urls,5) && (resolve(parsed_lgb.url)||true)) return;
        }
        catch(error) {
            reject(error);
            return;
        }
        if(type==="query" && (resolve("")||true)) return;

        reject("Nothing found");
        return;
    }
    function done_query_promises_then(result) {
        my_query.done.query_promises=true;
        submit_if_done();
    }

   

    /**
     * contact_response Here it searches for an email TODO:FIX */
    var contact_response=function(doc,url,resolve,reject,pos) {
        console.log("in contact_response,url="+url);
        var i,j,temp_email,links=doc.links,email_matches;
        var temp_url,curr_url;
        doc.body.innerHTML=doc.body.innerHTML.replace(/\s*([\[\(]{1})\s*at\s*([\)\]]{1})\s*/,"@")
            .replace(/\s*([\[\(]{1})\s*dot\s*([\)\]]{1})\s*/,".").replace(/dotcom/,".com");
        MTP.fix_emails(doc,url);
        if((email_matches=doc.body.innerHTML.match(my_email_re))) {
            for(j=0; j < email_matches.length; j++) {
                if(!MTurk.is_bad_email(email_matches[j]) && email_matches[j].length>0) my_query.email_list.push(new EmailQual(email_matches[j].toString(),url));
                if(email_matches[j].toLowerCase()===my_query.emails_to_check[pos]) {
                    console.log("Matched "+pos+" at "+url);
                    setEmailType(pos,0);
                }
            }
        }
        for(i=0; i < links.length; i++) {
            if(my_query.fields.email.length>0) continue;
            try {
                if((temp_email=links[i].href.replace(/^mailto:\s*/,"").match(email_re)) &&
                   !MTurkScript.prototype.is_bad_email(temp_email[0])) {
                    if(temp_email[0].toLowerCase()===my_query.emails_to_check[pos]) {
                        console.log("Matched "+pos+" at "+url);
                        setEmailType(pos,0);
                    }
                    my_query.email_list.push(new EmailQual(temp_email.toString(),url));
                }
            }
            catch(error) { console.log("Error with emails "+error); }
        }
        console.log("* doing doneQueries++ for "+url);
      //  console.log("contact_response, url="+url+", my_query.email_list="+JSON.stringify(my_query.email_list));
        resolve();
        return;
    };

    function done_email_promises_then(query) {
        console.log("Done email promises for some email");
         if(query.resolve&&query.reject&&do_next_email_query(query.resolve,query.reject)) {
            query.resolve("");
         }
        submit_if_done();
    }
    /* remove duplicates */
    function remove_dups(lst) {
        for(var i=lst.length-1;i>0;i--) {
            if(lst[i].email===lst[i-1].email && lst[i].url===lst[i-1].url) lst.splice(i,1);
        }

    }

    function EmailQual(email,url,the_name) {
        if(the_name===undefined) the_name=my_query.fullname;
        var fname=the_name.fname.replace(/\'/g,"").toLowerCase(),lname=the_name.lname.replace(/[\'\s]/g,"").toLowerCase();
        var email_regexps=
            [new RegExp("^"+fname.charAt(0)+"(\\.)?"+lname+"$","i"),new RegExp("^"+fname+"[\\._]{1}"+lname+"$","i"),
             new RegExp("^"+fname+lname.charAt(0)+"$","i"),new RegExp("^"+lname+fname.charAt(0)+"$","i")];
        this.email=email;
        this.url=url;
        this.domain=email.replace(/^[^@]*@/,"");
        this.quality=0;
        var email_begin=this.email.replace(/@[^@]*$/,"").toLowerCase();
        if(new RegExp(my_query.fullname.fname,"i").test(email_begin)) this.quality=1;
        if(new RegExp(my_query.fullname.lname.substr(0,5),"i").test(email_begin)) {
            this.quality=2;
            if(email_begin.toLowerCase().indexOf(my_query.fullname.lname.replace(/\'/g,"").toLowerCase())>0 &&
               my_query.fullname.fname.toLowerCase().charAt(0)===email_begin.toLowerCase().charAt(0)) this.quality=3;
        }
        /* Check if it's bad because wrong names */
        var split=email_begin.split(/[_\.]/);
        for(var i=0;i<email_regexps.length;i++) if(email_regexps[i].test(email_begin)) this.quality=4;

        if(my_query.domain && this.domain.toLowerCase().indexOf(my_query.domain.toLowerCase())!==-1&&this.quality>0) this.quality+=4;
        else if(!my_query.domain && this.quality>0) this.quality+=4; /* Added before domain found on query search */
        if(split.length>1) {
            var l_reg=new RegExp(lname,"i"),f_reg=new RegExp(fname,"i");
          //  console.log("split="+JSON.stringify(split)+" l_reg.test(split[0])="+l_reg.test(split[0])+", f_reg.test(split[0])="+f_reg.test(split[0])+", ");
           // console.log("f_reg.test(split[split.length-1])="+f_reg.test(split[split.length-1])+
           //             ", l_reg.test(split[split.length-1])="+l_reg.test(split[split.length-1]));
            if((f_reg.test(split[0]) && !l_reg.test(split[split.length-1])) ||
               (f_reg.test(split[split.length-1]) && !l_reg.test(split[0])) ||
              (!f_reg.test(split[0]) && l_reg.test(split[split.length-1]))||
               (!f_reg.test(split[split.length-1]) && l_reg.test(split[0]))) {
              //  console.log("!! failed, split="+JSON.stringify(split));
                this.quality=0;
            }
        }
        if(/app\.lead411\.com/.test(this.url)) this.quality=0;

    }
    /* Compare two EmailQual */
    function email_cmp(a,b) {
        try {
            if(a.quality!==b.quality) return b.quality-a.quality;
            else if(a.url<b.url) return -1;
            else if(b.url<a.url) return 1;
            else if(a.email.split("@")[1]<b.email.split("@")[1]) return -1;
            else if(a.email.split("@")[1]>b.email.split("@")[1]) return 1;
            else if(a.email.split("@")[0]<b.email.split("@")[0]) return -1;
            else if(a.email.split("@")[0]>b.email.split("@")[0]) return 1;
            else return 0;
        }
        catch(error) { return 0; }
    }

    function process_emails() {
        my_query.email_list.sort(email_cmp);
        remove_dups(my_query.email_list);
     //   console.log("my_query.email_list="+JSON.stringify(my_query.email_list));
        if(my_query.email_list.length>0&&my_query.email_list[0].quality>=4) {
            var temp=my_query.email_list[0];
            my_query.fields.email=temp.email;
            my_query.fields.url=temp.url;
        }
    }



    /* Search on bing for search_str, parse bing response with callback */
    function query_search(search_str, resolve,reject, callback,type,filters) {
        console.log("Searching with bing for "+search_str);
        if(!filters) filters="";
        var search_URIBing='https://www.bing.com/search?q='+
            encodeURIComponent(search_str)+"&filters="+filters+"&first=1&rdr=1";
        GM_xmlhttpRequest({method: 'GET', url: search_URIBing,
                           onload: function(response) { callback(response, resolve, reject,type); },
                           onerror: function(response) { reject("Fail"); },ontimeout: function(response) { reject("Fail"); }
                          });
    }

    function query_promise_then(result) {
        my_query.done.query=true;
       // rocket_promise_then(result);
        const rocketPromise = new Promise((resolve, reject) => {
            //console.log("Beginning rocket search");
            query_search(my_query.company+" email format site:rocketreach.co", resolve, reject, query_response,"rocket");
        });
        rocketPromise.then(rocket_promise_then)
            .catch(function(val) {
            //console.log("Failed at this rocketPromise " + val);
            rocket_promise_then("");
        });
        const emailformatPromise = new Promise((resolve, reject) => {
            //console.log("Beginning emailformat search");
            query_search(my_query.company+" email format site:email-format.com", resolve, reject, query_response,"emailformat");
        });
        emailformatPromise.then(emailformat_promise_then)
            .catch(function(val) {
            //console.log("Failed at this emailformatPromise " + val);
            emailformat_promise_then("");
        });
        Promise.all([rocketPromise,emailformatPromise]).then(domain_promise_then);
        console.log("query_promise_then, result="+result);

    }

    function domain_promise_then(result) {
        var search_str=my_query.company;
        const urlPromise = new Promise((resolve, reject) => {
            console.log("Beginning URL search");
            query_search(search_str, resolve, reject, query_response,"url");
        });
        urlPromise.then(url_promise_then)
            .catch(function(val) {
            console.log("Failed at this urlPromise " + val);
            if(my_query.try_count.query===0) {
                query_name_alone();
                return;
            }
            my_query.done.url=true;
            submit_if_done();
        //    GM_setValue("returnHit"+MTurk.assignment_id,true);
        });
    }

    /* Following finding the company URL */
    function url_promise_then(result) {
        console.log("# url_promise_then,result="+result);
        if(my_query.try_count.query>0 && my_query.alt_domains.length>0) my_query.domain=my_query.alt_domains[0];
        else my_query.domain=MTP.get_domain_only(result,true);
        let j;
        for(j=my_query.alt_domains.length-1;j>=0;j--) {
            if(my_query.domain===my_query.alt_domains[j]) my_query.alt_domains.splice(j,1);
        }
        setup_email_guesses();

        var lname=my_query.fullname.lname.replace(/\'/g,""),fname=my_query.fullname.fname.replace(/\'/g,"");
        var curr_email=fname.charAt(0).toLowerCase()+lname.toLowerCase()+"@"+my_query.domain;
        var search_str="+\""+curr_email+"\"";// OR "+
         //   "+\""+lname.toLowerCase()+fname.charAt(0).toLowerCase()+"@"+my_query.domain+"\"";
        console.log("new search_str for emails ="+search_str);
        //do_mailtester_query(curr_email);

        const emailPromise = new Promise((resolve, reject) => {

            if(my_query.try_count.query>0 && (my_query.original_domain===my_query.domain)) {
                my_query.doneEmail=my_query.email_types.length;
                resolve("");
                return;
            }
            console.log("$ Beginning Email search, original_domain="+my_query.original_domain+", domain="+my_query.domain);
            do_next_email_query(resolve,reject);
//            query_search(search_str, resolve, reject, query_response,"email");
        });
        emailPromise.then(email_promise_then)
            .catch(function(val) {
            console.log("Failed at this emailPromise " + val); email_promise_then();  });
    }

    function do_next_email_query(resolve,reject) {
        var search_str;
       // my_query.found_with_mailtester=true;
        console.log("do_next_email, query, try_count.email="+my_query.try_count.email);
        my_query.email_list.sort(email_cmp);
        if(my_query.try_count.email<my_query.email_types.length) {
            let curr_email=my_query.email_types[my_query.try_count.email];
            my_query.try_count.email++;
            search_str="+\""+curr_email+"\"";
            if(!my_query.found_with_mailtester && (my_query.email_list.length===0 || my_query.email_list[0].quality<6)) do_mailtester_query(curr_email);
            //console.log("trying email again with "+search_str);
            query_search(search_str,resolve,reject,query_response,"email");
            return true;
        }
        else {

            my_query.email_list.sort(email_cmp);
            if((my_query.email_list.length===0 || my_query.email_list[0].quality<4)  && my_query.try_count.query===0) {
             query_name_alone();
             return;
            }

        }
        resolve("");
    }

    function query_name_alone() {
        /* Try the name alone */
        my_query.doneEmail=0;
        my_query.try_count.query++;
        my_query.try_count.email=0;
        my_query.done.url=false;
        my_query.done.query=false;
        my_query.done.rocket=my_query.done.emailformat=false;
        my_query.original_company=my_query.company;
        my_query.original_domain=my_query.domain;
        const queryPromise = new Promise((resolve, reject) => {
            console.log("Beginning URL search");
            query_search(my_query.first+" "+(my_query.fullname.mname||"")+" "+my_query.last+" ", resolve, reject, query_response,"query"); //+(reverse_state_map[my_query.state]||"")
        });
        queryPromise.then(query_promise_then)
            .catch(function(val) {
            my_query.done.url=true;
            my_query.done.query=true;
            console.log("Failed at this queryPromise " + val);  submit_if_done(); });
    }



    function do_mailtester_query(email,pos) {

        var url="http://mailtester.com/testmail.php";
        var data={"lang":"en","email":email};
         var headers={"host":"mailtester.com","origin":"http://mailtester.com","Content-Type": "application/x-www-form-urlencoded",
                     "referer":"http://mailtester.com/testmail.php"};
        var data_str=MTP.json_to_post(data);
        my_query.totalMailTesterQueries++;
         console.log("do_mailtester_query, email="+email+", data_str="+data_str);
        var promise=new Promise((resolve,reject) => {
            GM_xmlhttpRequest({method: 'POST', headers:headers,data:data_str,anonymous:true,
                               url: url,
                               onload: function(response) {
                                   var doc = new DOMParser().parseFromString(response.responseText, "text/html");
                                   mailtester_response(doc,response.finalUrl, resolve, reject,{email:email,pos:pos});
                               },
                               onerror: function(response) { reject("Fail mailtester"); },ontimeout: function(response) { reject("Fail"); }
                              });
        });
        promise.then(function() {
            my_query.mailTesterQueries++;
            submit_if_done();
        }).catch(function() {
            my_query.mailTesterQueries++;
        submit_if_done();
        });
    }
    function mailtester_response(doc,url,resolve,reject,extra) {
        var email=extra.email,pos=extra.pos;
        console.log("mailtester_response,doc.body.innerHTML.length="+doc.body.innerHTML.length);
      // console.log(doc.body.innerHTML);
        var table=doc.querySelector("#content > table");
        if(table) {
       //    console.log("div.innerHTML="+div.innerHTML);
            let lastRow=table.rows[table.rows.length-1];
            let lastCell=lastRow.cells[lastRow.cells.length-1];
            let cellText=lastCell.innerText;
            console.log("email="+email+", lastCell="+lastCell.innerHTML);
            if(cellText.indexOf("E-mail address is valid")!==-1||
               cellText.indexOf("The user you are trying to contact is receiving mail at a rate that")!==-1) {
                setEmailType(pos,0);
                my_query.quality["email"+pos]=1;
            }
            else if(cellText.indexOf("Server doesn\'t allow e-mail address verification")!==-1||
                   cellText.indexOf("Internal resource temporarily unavailable")!==-1||cellText.indexOf("Connection refused")!==-1||
                   cellText.indexOf("The domain is invalid or no mail server was found for it")!==-1 ||
                   cellText.indexOf("Unknown response from mail server ")!==-1) {
                // Don't waste precious queries
                console.log("Setting found_with_mailtester due to not allowed");
                //my_query.found_with_mailtester=true;
               // setEmailType(pos,1);
            }
            else if(cellText.indexOf("E-mail address does not exist on this server")!==-1) {
                setEmailType(pos,2); }

        }
        else {
            console.log("doc.body.innerHTML="+doc.body.innerHTML);
        }
        resolve("");
    }

    function setEmailType(pos,num) {
        if(my_query.checkboxes["email"+(pos+1)]!==0) my_query.checkboxes["email"+(pos+1)]=num;

        add_to_sheet();
    }


    function email_promise_then(result) {
        console.log("In email_promise_then, result="+result);
    my_query.done.url=true;
        submit_if_done();
    }

    function begin_script(timeout,total_time,callback) {
        if(timeout===undefined) timeout=200;
        if(total_time===undefined) total_time=0;
        if(callback===undefined) callback=init_Query;
        if(MTurk!==undefined) { callback(); }
        else if(total_time<2000) {
            console.log("total_time="+total_time);
            total_time+=timeout;
            setTimeout(function() { begin_script(timeout,total_time,callback); },timeout);
            return;
        }
        else { console.log("Failed to begin script"); }
    }

    function add_to_sheet() {
        var x,field,i;
        process_emails(""); // Determine best current email
        for(x in my_query.fields) {
            if((MTurk.is_crowd && (field=document.getElementsByName(x)[0])) ||
	       (!MTurk.is_crowd && (field=document.getElementById(x)))) field.value=my_query.fields[x];
        }
        for(x in my_query.checkboxes) {
            field=document.querySelectorAll("[name='"+x+"']");
            console.log("x="+x+", field="+field+", my_query.checkboxes[x]="+my_query.checkboxes[x]);
            if(my_query.checkboxes[x]>=0 && my_query.checkboxes[x]<field.length) {
                field[my_query.checkboxes[x]].checked=true;
                for(i=0;i<field.length;i++) {
                    if(i!==my_query.checkboxes[x]) field[i].checked=false;
                }
            }
        }
    }

    function submit_if_done() {
        var is_done=true,x;
        add_to_sheet();
        console.log("submit_if_done, my_query.done="+JSON.stringify(my_query.done)+", my_query.mailTesterQueries="+my_query.mailTesterQueries+
                    ", my_query.totalMailTesterQueries="+my_query.totalMailTesterQueries+"\nmy_query.doneEmail="+my_query.doneEmail+
                    ", my_query.email_types.length="+(my_query.email_types.length||0)
                   );
        for(x in my_query.done) if(!my_query.done[x]) is_done=false;
        if(my_query.mailTesterQueries<my_query.totalMailTesterQueries || my_query.doneEmail < my_query.email_types.length) is_done=false;
        if(is_done && !my_query.submitted && (my_query.submitted=true)) {
            if(my_query.fields.email.length>0) MTurk.check_and_submit();
            else {
                my_query.fields.email="DIDNOT@FIND.COM";
                add_to_sheet();
                GM_setValue("returnHit"+MTurk.assignment_id,true);
            }
        }
    }

    /* Kevin Bryan only */
    function parse_initial_params_Bryan() {

        var removeP=document.querySelectorAll("form div > span > p");
        var i;
        var temp_email;
        var len=removeP.length;
        for(i=0;i<3 && i<removeP.length;i++) {
            //console.log("removeP["+len-1-i+"].innerText="+removeP[len-1-i].innerText);
            removeP[len-1-i].parentNode.removeChild(removeP[len-1-i]);
        }
        var p=document.querySelectorAll("form div div p");
        var re=/^[^:]*:\s*/,match;
        my_query.name=p[0].innerText.replace(re,"").trim();
        let fullname=MTP.parse_name(my_query.name.replace(/^[A-Z]\.\s*/,""));
        Object.assign(my_query,{first:fullname.fname,last:fullname.lname});
        my_query.company=p[1].innerText.replace(re,"");
        my_query.emails_to_check=[];
        for(i=2;i<p.length;i++) {
            if((temp_email=p[i].innerText.replace(/Email address [\d]*:\s*/,""))&&temp_email.trim().length>0) {
                my_query.emails_to_check.push(temp_email);
            }
        }
        my_query.fullname=fullname;
        my_query.company=my_query.company.replace(/^.* AS REPRESENTED BY THE [^,]*,/i,"").replace(/^.*\s*REGENTS\s*(,|OF)?\s*(THE)?/i,"")
            .replace(/ SYSTEM$/,"").replace(/^.*BOARD OF TRUSTEES OF /i,"");
        my_query.company=my_query.company;
    }
    /* setup the email_guesses
       TODO: nicknames?
     */
    function setup_email_guesses(the_name) {
        if(the_name===undefined) the_name=my_query.fullname;
        var lname=the_name.lname.replace(/[\'\s]/g,"").toLowerCase(),fname=the_name.fname.replace(/\'/g,"").toLowerCase();
        var minit=the_name.mname&&the_name.mname.length>0?the_name.mname.toLowerCase().charAt(0):"";
        my_query.email_types=[fname.charAt(0)+lname+"@"+my_query.domain,
                         fname+"."+lname+"@"+my_query.domain,
                         lname+"."+fname+"@"+my_query.domain,
                         fname+"_"+lname+"@"+my_query.domain,
                         fname+lname+"@"+my_query.domain,
                         lname+fname.charAt(0)+"@"+my_query.domain,
                         fname+lname.charAt(0)+"@"+my_query.domain,
                         lname+"@"+my_query.domain,
                              fname+"@"+my_query.domain,
                              fname+"."+minit+"."+lname+"@"+my_query.domain
                             ];
    }

    function make_queries(pos) {
        const queryPromise = new Promise((resolve, reject) => {
            console.log("Beginning URL search with "+my_query.emails_to_check[pos]);
            query_search("+\""+my_query.emails_to_check[pos]+"\"", resolve, reject, query_response,"query"+pos);
        });
        queryPromise.then(query_promise_then)
            .catch(function(val) {
            my_query.done.url=true;
            my_query.done.query=true;
            console.log("Failed at this queryPromise " + val);  submit_if_done(); });
        return queryPromise;
    }
    function my_func(e) {
        var x;
       // console.log("my_func called, e="+JSON.stringify(e)+", e.name="+e.target.name);
        var stuff=document.querySelectorAll("[name='"+e.target.name+"']");
        for(x of stuff) {
            //console.log("x="+x+",e.target="+e.target);
            if(x!==e.target) x.checked=false;
        }

    }
    function init_Query() {
        console.log("in init_query");
        GM_cookie.delete({ url: 'http://mailtester.com' }, function(error) {
            console.log(error || 'success');

        });

       // var crowd=doc
        var email1=document.querySelectorAll("[name='email1']");
       // email1[0].checked=true;
        var i,promise,st;
        bad_urls=bad_urls.concat(default_bad_urls);
     //   var wT=document.getElementById("DataCollection").getElementsByTagName("table")[0];

        my_query={fields:{email:"",url:""},checkboxes:{email1:-1,email2:-1,email3:-1},
                  done:{query:false,url:false,query_promises:false,rocket:true},quality:{},
                  submitted:false,try_count:{"email":0,"query":0,"url":0},email_list:[],emails_to_try:[],found_with_mailtester:false,
                  mailTesterQueries:0,totalMailTesterQueries:0,doneEmail:0,email_types:[],alt_domains:[],alt_companies:[]
                 };
        parse_initial_params_Bryan();
        console.log("my_query="+JSON.stringify(my_query));
        add_to_sheet();
        var promise_list=[];
        for(i=0;i<my_query.emails_to_check.length;i++) {
            my_query.try_count["query"+i]=0;
            my_query.quality["email"+i]=0;
            document.querySelectorAll("[name='email"+(i+1)+"']").forEach(function(elem) {
                elem.addEventListener("click",my_func);
            });
            promise_list.push(make_queries(i));
            do_mailtester_query(my_query.emails_to_check[i],i);
        }

    }


})();