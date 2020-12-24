<template>
    <div ref="videojsWrapper" class="videojs-component-wrapper">
    </div>
</template>

<script>
    /**
     * 传入参数videojsData：
     *   source：视频地址；
     *   videoId：播放器ID；
     */
    export default {
        props: {
            videojsData: {
                type: Object
            },
            muted: {
                type: Boolean,
                default: true
            }
        },
        data() {
            return {
                Player: null,
                setRestart: false,
            };
        },
        watch: {
            videojsData: {
                handler(newV, oldV) {
                    // console.log(newV, oldV)
                    if (newV.source == oldV.source) {
                        return
                    }
                    if (newV.source && newV.videoId == oldV.videoId) {
                        // 只更换地址
                        this.replaceUrl(newV, true);
                    } else {
                        this.disposePlayer();
                        let $videoEl = document.getElementById(oldV.videoId || "videojs");
                        if ($videoEl) {
                            $videoEl.remove();
                        }
                        // 重新初始化播放器
                        this.replaceUrl(newV, false);
                    }
                },
                deep: true,
            },
        },

        methods: {
            /**
             * 初始化播放器
             */
            initPlayer(data) {
                let vm = this;
                // 创建video标签
                let videoEl = document.createElement("video");
                videoEl.setAttribute("id", data.videoId || "videojs");
                videoEl.setAttribute("muted", vm.muted);
                videoEl.setAttribute("class", "video-js");
                videoEl.setAttribute(
                    "style",
                    "height:100%!important;width:100%;padding-top:0!important;"
                );
                this.$refs["videojsWrapper"].appendChild(videoEl);
                let playSources = this.initSource(data.source);
                let techOrder = ["html5", "flvjs", "flash"]

                function isIE() {
                    if (!!window.ActiveXObject || "ActiveXObject" in window) {
                        return true;
                    } else {
                        return false;
                    }
                }
                if (isIE()) {
                    techOrder = ["flash", "html5", "flvjs"]
                }
                //   console.log(techOrder)
                this.Player = videojs(
                    document.getElementById(data.videoId || "videojs"), {
                        controls: true, // 是否显示控制条
                        preload: "none",
                        liveui: true,
                        autoplay: true,
                        fluid: true, // 自适应宽高
                        language: "zh-CN", // 设置语言
                        muted: vm.muted, // 是否静音
                        inactivityTimeout: false,
                        flash: {
                            swf: "/static/lib/videojs/video-js.swf",
                        },
                        techOrder: techOrder,
                        techName: "flash",
                        //特别说明，使用flv播放时如果流没有声音，则会导致视频播放失败，
                        //解决方式 一、下里边设置 hasAudio: false 这种会导致所有播放的都不会有声音
                        //二、使用带有音频的流进行播放
                        flvjs: {
                            mediaDataSource: {
                                // hasAudio: false,
                                isLive: false,
                                cors: true,
                                withCredentials: false,
                            },
                        },
                        mediaDataSource: {
                            isLive: false,
                            cors: true,
                        },
                        controlBar: {
                            // 设置控制条组件
                            // 设置控制条里面组件的相关属性及显示与否
                            currentTimeDisplay: true,
                            timeDivider: true,
                            durationDisplay: true,
                            remainingTimeDisplay: false,
                            volumePanel: {
                                inline: false,
                            },
                            /* 使用children的形式可以控制每一个控件的位置，以及显示与否 */
                            children: [
                                { name: "playToggle" }, // 播放按钮
                                { name: "currentTimeDisplay" }, // 当前已播放时间
                                { name: "progressControl" }, // 播放进度条
                                { name: "durationDisplay" }, // 总时间
                                // {
                                //   // 倍数播放
                                //   name: "playbackRateMenuButton",
                                //   playbackRates: [0.5, 1, 1.5, 2, 2.5],
                                // },
                                {
                                    name: "volumePanel", // 音量控制
                                    inline: false, // 不使用水平方式
                                },
                                { name: "FullscreenToggle" }, // 全屏
                            ],
                        },
                        sources: playSources,
                        // sources: [
                        //   {
                        //     src: "rtmp://58.200.131.2:1935/livetv/hunantv",
                        //     type: "rtmp/flv",
                        //   },
                        // ],
                    },
                    function onPlayerReady() {
                        console.log("视频可以播放了", this);
                        this.muted(vm.muted);
                        // 设置重新初始化播放器定时器：30s
                        this.on("waiting", function() {
                            console.log("waiting")
                            vm.setRestart = setInterval((setRestart) => {
                                this.src(playSources);
                            }, 5 * 1000, vm.setRestart);
                        })
                        this.on("playing", function() {
                            console.log("playing")
                            clearInterval(vm.setRestart);
                            vm.setRestart = false
                        })
                        //   let initTimeouthandler = setTimeout(() => {
                        //     this.src(playSources);
                        //   }, 10 * 1000);
                        //   this.on("play", function (err) {
                        //       console.log(err)
                        //     clearTimeout(initTimeouthandler);
                        //   });
                        //   this.on("_onIOError", function(){
                        //       console.log("加载错误")
                        //       // 重新调用初始化函数
                        //       this.replaceUrl(vm.videojsData, true);
                        //   });
                    }
                );
            },

            /**
             * 更改播放器播放地址
             */
            replaceUrl(data, replaceUrl) {
                if (this.Player && replaceUrl) {
                    let sourceObj = this.initSource(data.source);
                    // 已经存在初始化的播放器且没有传入新的videoId，则直接更换视频地址
                    this.Player.reset(); //重置 video
                    this.Player.src(sourceObj);
                } else {
                    this.$nextTick(() => {
                        this.initPlayer({
                            source: data.source,
                            videoId: data.videoId,
                        });
                    });
                }
            },

            /**
             * 根据播放地址格式mp4,rtmp,hls,flv，返回对应的source type值
             */
            getSourceType(url) {
                if (url.match(/rtmp\:|RTMP\:/)) {
                    // rtmp流
                    return "rtmp/flv";
                }
                if (url.match(/\.m3u8|\.M3U8/)) {
                    // hls流
                    return "application/x-mpegURL";
                }
                if (url.match(/\.flv|\.FLV/)) {
                    // flv流
                    return "video/x-flv";
                }
                // 其他流
                return "video/mp4";
            },

            /**
             * 根据用户传入的播放地址，整理成播放器需要的格式
             */
            initSource(url) {
                let sources = [];
                if (!url) {
                    throw new Error("没有传入视频地址!");
                }
                if (url && Array.isArray(url)) {
                    // 多个流地址
                    url.forEach((item) => {
                        let source_item = {
                            poster: "./image/1.jpg",
                        };
                        if (typeof item === "string") {
                            // 传入的视频地址是字符串
                            source_item.src = item;
                            source_item.type = this.getSourceType(item);
                        } else if (item.src) {
                            // 传入的视频地址是对象，src字段为视频地址
                            source_item.src = item.src;
                            source_item.type = this.getSourceType(item.src);
                        } else {
                            throw new Error("传入视频地址格式错误!");
                        }
                        sources.push(source_item);
                    });
                } else if (typeof url === "string") {
                    // 传入的视频地址是字符串
                    sources = [{
                        src: url,
                        type: this.getSourceType(url),
                    }, ];
                } else if (url.src) {
                    // 传入的视频地址是对象，src字段为视频地址
                    sources = [{
                        src: url.src,
                        type: this.getSourceType(url.src),
                    }, ];
                }
                //   "rtmp/flv"
                //   "application/x-mpegURL"
                //   "video/x-flv"
                //   "video/mp4"
                sources[0].type = "video/x-flv"
                sources[0].isLive = true
                return sources;
            },

            /**
             *
             */
            disposePlayer() {
                if (this.Player) {
                    this.Player.dispose();
                    this.Player = null;
                }
            },
        },
        mounted() {
            if (this.videojsData.source) {
                this.initPlayer(this.videojsData);
            }
        },
        beforeDestroy() {
            this.disposePlayer();
        },
    };
</script>

<style scoped>
    .videojs-component-wrapper {
        width: 100%;
        height: 100% !important;
    }
</style>