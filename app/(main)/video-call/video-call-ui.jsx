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

  // Handle script load
  const handleScriptLoad = () => {
    setScriptLoaded(true);
    if (!window.OT) {
      toast.error(t("videoCall.vonageLoadFailed"));
      setIsLoading(false);
      return;
    }
    initializeSession();
  };

  // Initialize video session
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

      // Handle session events
      sessionRef.current.on("sessionConnected", () => {
        setIsConnected(true);
        if (appointmentId) {
          recordVideoPresence(appointmentId).catch(() => {});
        }
        setIsLoading(false);

        // THIS IS THE FIX - Initialize publisher AFTER session connects
        publisherRef.current = window.OT.initPublisher(
          "publisher", // This targets the div with id="publisher"
          {
            insertMode: "replace", // Change from "append" to "replace"
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

      // Connect to the session
      sessionRef.current.connect(token, (error) => {
        if (error) {
          toast.error(t("videoCall.sessionConnectError"));
        } else {
          // Publish your stream AFTER connecting
          if (publisherRef.current) {
            sessionRef.current.publish(publisherRef.current, (error) => {
              if (error) {
                toast.error(t("videoCall.publishError"));
              }
            });
          }
        }
      });
    } catch (error) {
      toast.error(t("videoCall.initFailed"));
      setIsLoading(false);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (publisherRef.current) {
      publisherRef.current.publishVideo(!isVideoEnabled);
      setIsVideoEnabled((prev) => !prev);
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (publisherRef.current) {
      publisherRef.current.publishAudio(!isAudioEnabled);
      setIsAudioEnabled((prev) => !prev);
    }
  };

  // End call
  const endCall = () => {
    // Properly destroy publisher
    if (publisherRef.current) {
      publisherRef.current.destroy();
      publisherRef.current = null;
    }
    setIsPublisherReady(false);

    // Disconnect session
    if (sessionRef.current) {
      sessionRef.current.disconnect();
      sessionRef.current = null;
    }

    router.push("/appointments");
  };

  // Cleanup on unmount
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
      <div className="text-center">
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

      <div>
        <PageHeader icon={<Video />} title={t("videoCall.title")} backLink="/appointments" />
        <p className="-mt-4 mb-6 text-center text-sm text-muted-foreground">
          {isConnected
            ? t("videoCall.connected")
            : isLoading
              ? t("videoCall.connecting")
              : t("videoCall.connectionFailed")}
        </p>

        {isLoading && !scriptLoaded ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
            <p className="text-lg text-foreground">{t("videoCall.loadingComponents")}</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Publisher (Your video) */}
              <div className="border home-card-gradient border-0 ring-1 ring-primary/10 rounded-lg overflow-hidden">
                <div className="bg-primary/5 px-3 py-2 text-primary text-sm font-medium">
                  {t("videoCall.you")}
                </div>
                <div
                  id="publisher"
                  className="w-full h-[300px] md:h-[400px] bg-muted/30"
                >
                  {!scriptLoaded && (
                    <div className="flex items-center justify-center h-full">
                      <div className="bg-muted/20 rounded-full p-8">
                        <User className="h-12 w-12 text-primary" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Subscriber (Other person's video) */}
              <div className="border home-card-gradient border-0 ring-1 ring-primary/10 rounded-lg overflow-hidden">
                <div className="bg-primary/5 px-3 py-2 text-primary text-sm font-medium">
                  {t("videoCall.otherParticipant")}
                </div>
                <div
                  id="subscriber"
                  className="w-full h-[300px] md:h-[400px] bg-muted/30"
                >
                  {(!isConnected || !scriptLoaded) && (
                    <div className="flex items-center justify-center h-full">
                      <div className="bg-muted/20 rounded-full p-8">
                        <User className="h-12 w-12 text-primary" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Video controls */}
            <div className="flex justify-center space-x-4">
              <Button
                variant="outline"
                size="lg"
                onClick={toggleVideo}
                className={`rounded-full p-4 h-14 w-14 ${
                  isVideoEnabled
                    ? "border-primary/20"
                    : "bg-red-900/20 border-red-900/30 text-red-400"
                }`}
                disabled={!isPublisherReady}
              >
                {isVideoEnabled ? <Video /> : <VideoOff />}
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={toggleAudio}
                className={`rounded-full p-4 h-14 w-14 ${
                  isAudioEnabled
                    ? "border-primary/20"
                    : "bg-red-900/20 border-red-900/30 text-red-400"
                }`}
                disabled={!isPublisherReady}
              >
                {isAudioEnabled ? <Mic /> : <MicOff />}
              </Button>

              <Button
                variant="destructive"
                size="lg"
                onClick={endCall}
                className="rounded-full p-4 h-14 w-14 bg-red-600 hover:bg-red-700"
              >
                <PhoneOff />
              </Button>
            </div>

            <div className="text-center">
              <p className="text-muted-foreground text-sm">
                {isVideoEnabled ? t("videoCall.cameraOn") : t("videoCall.cameraOff")} •
                {isAudioEnabled ? ` ${t("videoCall.micOn")}` : ` ${t("videoCall.micOff")}`}
              </p>
              <p className="text-muted-foreground text-sm mt-1">{t("videoCall.endCallHint")}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
