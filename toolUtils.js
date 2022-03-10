export const debounce = (fn, wait) => {
	let timer, timeStamp=0;
	let context, args;
 
	let run = ()=>{
		timer= setTimeout(()=>{
			fn.apply(context,args);
		},wait);
	}
	let clean = () => {
		clearTimeout(timer);
	}
 
	return function(){
		context=this;
		args=arguments;
		let now = (new Date()).getTime();
 
		if(now-timeStamp < wait){
			console.log('reset',now);
			clean();  // clear running timer 
			run();    // reset new timer from current time
		}else{
			console.log('set',now);
			run();    // last timer alreay executed, set a new timer
		}
		timeStamp=now;
	}
}