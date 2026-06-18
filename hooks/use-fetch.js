import { useState } from "react";
import { toast } from "sonner";
import { useLocale } from "@/components/locale-provider";
import { translateActionError } from "@/lib/i18n-errors";

const useFetch = (cb) => {
  const { dict } = useLocale();
  const [data, setData] = useState(undefined);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  const fn = async (...args) => {
    setLoading(true);
    setError(null);

    try {
      const response = await cb(...args);
      if (
        response &&
        typeof response === "object" &&
        response.success === false &&
        response.error
      ) {
        const message = translateActionError(dict, response.error);
        setData(response);
        setError(new Error(message));
        toast.error(message);
      } else {
        setData(response);
        setError(null);
      }
      return response;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : translateActionError(dict, {});
      setError(err instanceof Error ? err : new Error(message));
      toast.error(message);
      return undefined;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, fn, setData };
};

export default useFetch;
