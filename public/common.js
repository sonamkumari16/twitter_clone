$(document).ready(()=>{
    $('#tweet').keyup((event)=>{
        var textbox=$(event.target);
        var value=textbox.val().trim();

        var submitButton=$('#btn');

        if(submitButton.length==0){
            return alert("No submit button found");
        }

        if(value==""){
            submitButton.prop("disabled",true);
            return;
        }
        submitButton.prop("disabled",false);
    })
    const likebtns=document.querySelectorAll(".likebtn");
    likebtns.forEach(likebtn=>{
        const likeicon =likebtn.firstElementChild;
        const likeCount=likeicon.nextElementSibling;
        likebtn.addEventListener('click',(e)=>{
            console.log(likeicon);
            let isLiked=false;
            if(likeicon.classList.toggle('fa-solid')){
                likeCount.innerText=parseInt(likeCount.innerText)+1;
                isLiked=true;
            }
            else{
                likeCount.innerText=parseInt(likeCount.innerText)-1;
                isLiked=false;
            }
            const tweetId= likebtn.getAttribute('data-tweetId');
            const data = {
                isLiked,
            };
            fetch(`/like/${tweetId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              }).then((res) => {
                console.log("Request complete! response:", res);
            });
        })
    })
    
})