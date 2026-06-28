"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import {
  Loader2,
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { recordVideoPresence } from "@/actions/appointments";
import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

const VIDEO_SURFACE_CLASS =
  "absolute inset-0 size-full [&_.OT_root]:!size-full [&_.OT_widget-container]:!size-full [&_video]:size-full [&_video]:object-cover";

export default function VideoCall({ sessionId, token, appointmentId }) {
  const { t } = useLocale();
  const [isLoading, setIsLoading] = useState(true);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isPublisherReady, setIsPublisherReady] = useState(false);

  const sessionRef = useRef(null);
  const publisherRef = useRef(null);

  const router = useRouter();

  const appId = process.env.NEXT_PUBLIC_VONAGE_APPLICATION_ID;

  const handleScriptLoad = () => {
    setScriptLoaded(true);
    if (!window.OT) {
      toast.error(t("videoCall.vonageLoadFailed"));
      setIsLoading(false);
      return;
    }
    initializeSession();
  };

  const initializeSession = () => {
    if (!appId || !sessionId || !token) {
      toast.error(t("videoCall.missingParams"));
      router.push("/appointments");
      return;
    }

    try {
      sessionRef.current = window.OT.initSession(appId, sessionId);

      sessionRef.current.on("streamCreated", (event) => {
        sessionRef.current.subscribe(
          event.stream,
          "subscriber",
          {
            insertMode: "append",
            width: "100%",
            height: "100%",
          },
          (error) => {
            if (error) {
              toast.error(t("videoCall.subscriberError"));
            }
          }
        );
      });

      sessionRef.current.on("sessionConnected", () => {
        setIsConnected(true);
        if (appointmentId) {
          recordVideoPresence(appointmentId).catch(() => {});
        }
        setIsLoading(false);

        publisherRef.current = window.OT.initPublisher(
          "publisher",
          {
            insertMode: "replace",
            width: "100%",
            height: "100%",
            publishAudio: isAudioEnabled,
            publishVideo: isVideoEnabled,
          },
          (error) => {
            if (error) {
              toast.error(t("videoCall.publisherInitError"));
            } else {
              setIsPublisherReady(true);
            }
          }
        );
      });

      sessionRef.current.on("sessionDisconnected", () => {
        setIsConnected(false);
      });

      sessionRef.current.connect(token, (error) => {
        if (error) {
          toast.error(t("videoCall.sessionConnectError"));
        } else if (publisherRef.current) {
          sessionRef.current.publish(publisherRef.current, (error) => {
            if (error) {
              toast.error(t("videoCall.publishError"));
            }
          });
        }
      });
    } catch {
      toast.error(t("videoCall.initFailed"));
      setIsLoading(false);
    }
  };

  const toggleVideo = () => {
    if (publisherRef.current) {
      publisherRef.current.publishVideo(!isVideoEnabled);
      setIsVideoEnabled((prev) => !prev);
    }
  };

  const toggleAudio = () => {
    if (publisherRef.current) {
      publisherRef.current.publishAudio(!isAudioEnabled);
      setIsAudioEnabled((prev) => !prev);
    }
  };

  const endCall = () => {
    if (publisherRef.current) {
      publisherRef.current.destroy();
      publisherRef.current = null;
    }
    setIsPublisherReady(false);

    if (sessionRef.current) {
      sessionRef.current.disconnect();
      sessionRef.current = null;
    }

    router.push("/appointments");
  };

  useEffect(() => {
    return () => {
      if (publisherRef.current) {
        publisherRef.current.destroy();
      }
      if (sessionRef.current) {
        sessionRef.current.disconnect();
      }
    };
  }, []);

  if (!sessionId || !token || !appId) {
    return (
      <div className="min-w-0 text-center">
        <PageHeader
          icon={<Video />}
          title={t("videoCall.invalidTitle")}
          backLink="/appointments"
        />
        <p className="mb-6 text-muted-foreground">{t("videoCall.invalidDesc")}</p>
        <Button onClick={() => router.push("/appointments")}>
          {t("videoCall.backToAppointments")}
        </Button>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://unpkg.com/@vonage/client-sdk-video@latest/dist/js/opentok.js"
        onLoad={handleScriptLoad}
        onError={() => {
          toast.error(t("videoCall.scriptLoadFailed"));
          setIsLoading(false);
        }}
      />

      <div className="min-w-0">
        <PageHeader icon={<Video />} title={t("videoCall.title")} backLink="/appointments" />
        <p className="-mt-4 mb-4 text-center text-sm text-muted-foreground sm:mb-6">
          {isConnected
            ? t("videoCall.connected")
            : isLoading
              ? t("videoCall.connecting")
              : t("videoCall.connectionFailed")}
        </p>

        {isLoading && !scriptLoaded ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-foreground">{t("videoCall.loadingComponents")}</p>
          </div>
        ) : (
          <div className="min-w-0 space-y-4 sm:space-y-6">
            {/* Mobile: remote full + local PiP. Desktop: side-by-side */}
            <div className="relative min-w-0 md:grid md:grid-cols-2 md:gap-6">
              <div className="relative min-w-0 overflow-hidden rounded-lg border border-0 ring-1 ring-primary/10 home-card-gradient">
                <div className="bg-primary/5 px-3 py-2 text-sm font-medium text-primary">
                  {t("videoCall.otherParticipant")}
                </div>
                <div className="relative aspect-[4/3] w-full max-h-[55vh] bg-muted/30 sm:aspect-video sm:max-h-[60vh] md:max-h-none md:min-h-[280px] md:max-h-none lg:min-h-[360px]">
                  <div id="subscriber" className={VIDEO_SURFACE_CLASS}>
                    {(!isConnected || !scriptLoaded) && (
                      <div className="flex size-full items-center justify-center">
                        <div className="rounded-full bg-muted/20 p-6 sm:p-8">
                          <User className="h-10 w-10 text-primary sm:h-12 sm:w-12" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  "overflow-hidden rounded-lg border border-0 ring-1 ring-primary/10 home-card-gradient",
                  "absolute bottom-3 end-3 z-10 w-[34%] min-w-[108px] max-w-[148px] shadow-lg",
                  "md:static md:w-auto md:min-w-0 md:max-w-none md:shadow-none"
                )}
              >
                <div className="bg-primary/5 px-2 py-1.5 text-xs font-medium text-primary md:px-3 md:py-2 md:text-sm">
                  {t("videoCall.you")}
                </div>
                <div className="relative aspect-[3/4] w-full bg-muted/30 md:aspect-video md:min-h-[280px] lg:min-h-[360px]">
                  <div id="publisher" className={VIDEO_SURFACE_CLASS}>
                    {!scriptLoaded && (
                      <div className="flex size-full items-center justify-center">
                        <div className="rounded-full bg-muted/20 p-4 md:p-8">
                          <User className="h-8 w-8 text-primary md:h-12 md:w-12" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={toggleVideo}
                className={cn(
                  "h-12 w-12 rounded-full p-0 sm:h-14 sm:w-14",
                  isVideoEnabled
                    ? "border-primary/20"
                    : "border-red-900/30 bg-red-900/20 text-red-400"
                )}
                disabled={!isPublisherReady}
                aria-label={isVideoEnabled ? t("videoCall.cameraOn") : t("videoCall.cameraOff")}
              >
                {isVideoEnabled ? <Video /> : <VideoOff />}
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={toggleAudio}
                className={cn(
                  "h-12 w-12 rounded-full p-0 sm:h-14 sm:w-14",
                  isAudioEnabled
                    ? "border-primary/20"
                    : "border-red-900/30 bg-red-900/20 text-red-400"
                )}
                disabled={!isPublisherReady}
                aria-label={isAudioEnabled ? t("videoCall.micOn") : t("videoCall.micOff")}
              >
                {isAudioEnabled ? <Mic /> : <MicOff />}
              </Button>

              <Button
                variant="destructive"
                size="lg"
                onClick={endCall}
                className="h-12 w-12 rounded-full bg-red-600 p-0 hover:bg-red-700 sm:h-14 sm:w-14"
                aria-label={t("videoCall.endCallHint")}
              >
                <PhoneOff />
              </Button>
            </div>

            <div className="pb-2 text-center">
              <p className="text-sm text-muted-foreground">
                {isVideoEnabled ? t("videoCall.cameraOn") : t("videoCall.cameraOff")} •
                {isAudioEnabled ? ` ${t("videoCall.micOn")}` : ` ${t("videoCall.micOff")}`}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{t("videoCall.endCallHint")}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
